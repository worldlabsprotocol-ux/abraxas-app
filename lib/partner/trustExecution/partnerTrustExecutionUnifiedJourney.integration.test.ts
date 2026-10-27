/**
 * Build #855 — unified sovereign partner execution journey (disposable PG).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { Keypair } from "@solana/web3.js";
import { applySovereignSliceSchema } from "@/lib/persistence/boundary/sovereignSlice/bootstrap";
import { resetSovereignStagingPgPoolForTests } from "@/lib/persistence/boundary/sovereignStagingPg";
import { signWalletScopedTrustMessage } from "@/lib/protocolExecution/walletSovereignTrustPath";
import { loadScopedTrustChallenge } from "@/lib/auth/walletAuthorization/scopedChallengePostgresStore";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { registryEnv } from "@/lib/persistence/boundary/staging/build834Fixtures";
import {
  executePartnerTrustExecutionJourney,
  loadPartnerTrustExecutionJourney,
  startPartnerTrustExecutionJourney,
} from "./partnerTrustExecutionJourney";
import {
  authorizePartnerTrustExecution,
  issuePartnerTrustExecutionChallenge,
} from "./partnerTrustExecutionService";
import { buildDemoTrustAnchorFromEnv, verifyTrustExecutionMaterial } from "./verifyTrustExecutionMaterial";
import { POST as evaluatePOST } from "@/app/api/v1/partner-flow/evaluate/route";

const PROOF = process.env.ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF === "1";
const describeProof = PROOF ? describe : describe.skip;

const PARTNER = "partner-build855";
const OTHER_PARTNER = "partner-build855-other";
const APP_ID = "00000000-0000-4000-8000-000000008855";
const APP_ID_B = "00000000-0000-4000-8000-000000008856";
const POLICY = "policy-build855";

describeProof("Build #855 unified partner trust execution journey", () => {
  let pool: pg.Pool;
  let kp: Keypair;
  let wallet: string;

  beforeAll(async () => {
    process.env.ABRAXAS_SOVEREIGN_ENV_CLASS = "disposable";
    process.env.ABRAXAS_SOVEREIGN_STAGING_FIXTURE_WRITES = "true";
    process.env.ABRAXAS_TRUST_EXECUTION_CONTROLLED_TEST_EVIDENCE = "1";
    process.env.ABRAXAS_TRUST_EXECUTION_FIXTURE_ATTESTATION = "disposable_ci_only";
    process.env.VERCEL_ENV = "development";

    const receiptKey = generateTestSigningKeyPair("build855-issuer");
    const anchorKey = generateTestSigningKeyPair("build855-anchor");
    const statusSignerKey = generateTestSigningKeyPair("build855-status");
    Object.assign(
      process.env,
      registryEnv(receiptKey, anchorKey, process.env),
      {
        ABRAXAS_STATUS_SIGNER_KEY_ID: statusSignerKey.signingKeyId,
        ABRAXAS_STATUS_SIGNER_PRIVATE_JWK: JSON.stringify(statusSignerKey.privateKeyJwk),
        ABRAXAS_STATUS_SIGNER_PUBLIC_JWK: JSON.stringify(statusSignerKey.publicKeyJwk),
        VERCEL_ENV: "development",
      },
    );

    const dbName = "abraxas_build855_primary";
    const admin = new pg.Pool({
      connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
    });
    if (!process.env.ABRAXAS_SOVEREIGN_STAGING_PG_URL?.trim()) {
      await admin.query(`drop database if exists "${dbName}"`);
      await admin.query(`create database "${dbName}"`);
    }
    await admin.end();
    const url =
      process.env.ABRAXAS_SOVEREIGN_STAGING_PG_URL?.trim()
      ?? `postgresql://postgres:postgres@127.0.0.1:5432/${dbName}`;
    process.env.ABRAXAS_SOVEREIGN_STAGING_PG_URL = url;
    process.env.ABRAXAS_DATABASE_URL = url;
    pool = new pg.Pool({ connectionString: url });
    await applySovereignSliceSchema(pool);
    for (const pid of [PARTNER, OTHER_PARTNER]) {
      await pool.query(`insert into public.partners (partner_id, status) values ($1,'active') on conflict do nothing`, [pid]);
    }
    await pool.query(
      `insert into public.partner_policies (id, partner_id, version, name, rules_json, status)
       values ($1,$2,1,'build855-trust-exec','{}','active')
       on conflict (id, version) do nothing`,
      [POLICY, PARTNER],
    );
    await pool.query(
      `insert into public.issuer_signing_keys (signing_key_id, status) values ($1,'active')
       on conflict (signing_key_id) do nothing`,
      [receiptKey.signingKeyId],
    );
    for (const appId of [APP_ID, APP_ID_B]) {
      await pool.query(
        `insert into public.partner_launchpad_applications (id, partner_id, status, policy_id, policy_version)
         values ($1::uuid,$2,'active',$3,1) on conflict (id) do update set partner_id = excluded.partner_id`,
        [appId, PARTNER, POLICY],
      );
    }
    kp = Keypair.generate();
    wallet = kp.publicKey.toBase58();
  }, 120_000);

  afterAll(async () => {
    resetSovereignStagingPgPoolForTests();
    await pool?.end().catch(() => undefined);
  });

  it("runs start → authorize → execute → independent verification", async () => {
    const started = await startPartnerTrustExecutionJourney({
      partnerId: PARTNER,
      applicationId: APP_ID,
      holderWalletAddress: wallet,
      origin: "https://ci.abraxas.test",
      uri: "https://ci.abraxas.test/journey",
      solanaNetwork: "devnet",
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.journey.phase).toBe("awaiting_holder_authorization");
    expect(started.journey.holder_url).toContain("/partner/trust-execution");

    const row = await loadScopedTrustChallenge(started.journey.challenge_id);
    const signature = signWalletScopedTrustMessage(row!.message, kp);
    const authorized = await authorizePartnerTrustExecution({
      challengeId: started.journey.challenge_id,
      walletAddress: wallet,
      signature,
      solanaNetwork: "devnet",
    });
    expect(authorized.ok).toBe(true);
    if (!authorized.ok) return;

    const pending = await loadPartnerTrustExecutionJourney({
      partnerId: PARTNER,
      applicationId: APP_ID,
      challengeId: started.journey.challenge_id,
    });
    expect(pending.ok).toBe(true);
    if (!pending.ok) return;
    expect(pending.journey.phase).toBe("authorized_pending_execution");

    const executed = await executePartnerTrustExecutionJourney({
      partnerId: PARTNER,
      applicationId: APP_ID,
      challengeId: started.journey.challenge_id,
    });
    if (!executed.ok) {
      throw new Error(`execute failed: ${executed.code} (${executed.decision_result ?? ""})`);
    }
    expect(executed.ok).toBe(true);
    if (!executed.ok) return;
    expect(executed.journey.receipt_id).toBeTruthy();
    expect(executed.journey.independent_verification_material?.portable_receipt).toBeTruthy();

    const anchor = buildDemoTrustAnchorFromEnv(process.env);
    expect(anchor).toBeTruthy();
    if (!anchor || !executed.journey.independent_verification_material) return;
    const independent = verifyTrustExecutionMaterial({
      material: executed.journey.independent_verification_material,
      pinnedTrustAnchor: anchor,
      partnerId: PARTNER,
      policyId: POLICY,
    });
    expect(independent.cryptographically_authentic).toBe(true);

    const retry = await executePartnerTrustExecutionJourney({
      partnerId: PARTNER,
      applicationId: APP_ID,
      challengeId: started.journey.challenge_id,
    });
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    expect(retry.journey.receipt_id).toBe(executed.journey.receipt_id);
  });

  it("fail-closes tenant isolation on journey load", async () => {
    const issued = await issuePartnerTrustExecutionChallenge({
      partnerId: PARTNER,
      applicationId: APP_ID,
      holderWalletAddress: wallet,
      origin: "https://ci.abraxas.test",
      uri: "https://ci.abraxas.test/t",
      solanaNetwork: "devnet",
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    const cross = await loadPartnerTrustExecutionJourney({
      partnerId: OTHER_PARTNER,
      applicationId: APP_ID,
      challengeId: issued.challenge_id,
    });
    expect(cross.ok).toBe(false);
    if (cross.ok) return;
    expect(cross.code).toBe("tenant_mismatch");
  });

  it("fail-closes application isolation on journey load and execute", async () => {
    const issued = await issuePartnerTrustExecutionChallenge({
      partnerId: PARTNER,
      applicationId: APP_ID,
      holderWalletAddress: wallet,
      origin: "https://ci.abraxas.test",
      uri: "https://ci.abraxas.test/app-a",
      solanaNetwork: "devnet",
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;

    const wrongAppLoad = await loadPartnerTrustExecutionJourney({
      partnerId: PARTNER,
      applicationId: APP_ID_B,
      challengeId: issued.challenge_id,
    });
    expect(wrongAppLoad.ok).toBe(false);
    if (wrongAppLoad.ok) return;
    expect(wrongAppLoad.code).toBe("application_mismatch");

    const row = await loadScopedTrustChallenge(issued.challenge_id);
    const signature = signWalletScopedTrustMessage(row!.message, kp);
    const authorized = await authorizePartnerTrustExecution({
      challengeId: issued.challenge_id,
      walletAddress: wallet,
      signature,
      solanaNetwork: "devnet",
    });
    expect(authorized.ok).toBe(true);
    if (!authorized.ok) return;

    const wrongAppExecute = await executePartnerTrustExecutionJourney({
      partnerId: PARTNER,
      applicationId: APP_ID_B,
      challengeId: issued.challenge_id,
    });
    expect(wrongAppExecute.ok).toBe(false);
    if (wrongAppExecute.ok) return;
    expect(wrongAppExecute.code).toBe("application_mismatch");

    const correctExecute = await executePartnerTrustExecutionJourney({
      partnerId: PARTNER,
      applicationId: APP_ID,
      challengeId: issued.challenge_id,
    });
    expect(correctExecute.ok).toBe(true);
  });

  it("fail-closes incomplete portable verification material", () => {
    const incomplete = verifyTrustExecutionMaterial({
      material: { portable_receipt: {} as never },
      pinnedTrustAnchor: buildDemoTrustAnchorFromEnv(process.env)!,
      partnerId: PARTNER,
      policyId: POLICY,
    });
    expect(incomplete.cryptographically_authentic).toBe(false);
    expect(incomplete.failure_codes).toContain("verification_material_incomplete");
  });

  it("rejects execute before holder authorization", async () => {
    const started = await startPartnerTrustExecutionJourney({
      partnerId: PARTNER,
      applicationId: APP_ID,
      holderWalletAddress: wallet,
      origin: "https://ci.abraxas.test",
      uri: "https://ci.abraxas.test/journey2",
      solanaNetwork: "devnet",
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const executed = await executePartnerTrustExecutionJourney({
      partnerId: PARTNER,
      applicationId: APP_ID,
      challengeId: started.journey.challenge_id,
    });
    expect(executed.ok).toBe(false);
    if (executed.ok) return;
    expect(executed.code).toBe("awaiting_holder_authorization");
  });

  it("preserves legacy partner-flow evaluate route export", () => {
    expect(typeof evaluatePOST).toBe("function");
  });

  it("preserves legacy partner-flow complete route export", async () => {
    const { POST: completePOST } = await import("@/app/api/v1/partner-flow/complete/route");
    expect(typeof completePOST).toBe("function");
  });
});
