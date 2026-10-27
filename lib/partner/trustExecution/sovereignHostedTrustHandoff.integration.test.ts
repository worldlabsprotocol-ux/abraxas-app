/**
 * Sovereign hosted handoff + evaluate continuation (disposable PG, HTTP routes).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import pg from "pg";
import { Keypair } from "@solana/web3.js";
import { NextRequest } from "next/server";
import { applySovereignSliceSchema } from "@/lib/persistence/boundary/sovereignSlice/bootstrap";
import { resetSovereignStagingPgPoolForTests } from "@/lib/persistence/boundary/sovereignStagingPg";
import { signWalletScopedTrustMessage } from "@/lib/protocolExecution/walletSovereignTrustPath";
import { loadScopedTrustChallenge } from "@/lib/auth/walletAuthorization/scopedChallengePostgresStore";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { registryEnv } from "@/lib/persistence/boundary/staging/build834Fixtures";
import { POST as authorizePOST } from "@/app/api/v1/partner-flow/trust-execution/authorize/route";
import { GET as continueContextGET } from "@/app/api/v1/hosted-handoff/continue-context/route";
import { POST as evaluatePOST } from "@/app/api/v1/partner-flow/evaluate/route";
import { createSovereignHostedTrustHandoff } from "./sovereignHostedTrustHandoff";
import {
  executePartnerTrustExecutionJourney,
  loadPartnerTrustExecutionJourney,
} from "./partnerTrustExecutionJourney";
import { authorizePartnerTrustExecution } from "./partnerTrustExecutionService";
import { verifyTrustExecutionMaterial, buildDemoTrustAnchorFromEnv } from "./verifyTrustExecutionMaterial";

const PROOF = process.env.ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF === "1";
const describeProof = PROOF ? describe : describe.skip;

const PARTNER = "partner-handoff856";
const OTHER_PARTNER = "partner-handoff856-other";
const APP_A = "00000000-0000-4000-8000-000000008860";
const APP_B = "00000000-0000-4000-8000-000000008861";
const POLICY = "policy-handoff856";

vi.mock("@/lib/auth/ephemeralWallet/walletSession", () => ({
  requireEphemeralWalletScope: vi.fn(),
}));

describeProof("Sovereign hosted handoff and evaluate continuation", () => {
  let pool: pg.Pool;
  let kp: Keypair;
  let wallet: string;

  beforeAll(async () => {
    process.env.ABRAXAS_SOVEREIGN_ENV_CLASS = "disposable";
    process.env.ABRAXAS_SOVEREIGN_STAGING_FIXTURE_WRITES = "true";
    process.env.ABRAXAS_TRUST_EXECUTION_CONTROLLED_TEST_EVIDENCE = "1";
    process.env.ABRAXAS_TRUST_EXECUTION_FIXTURE_ATTESTATION = "disposable_ci_only";
    process.env.VERCEL_ENV = "development";

    const receiptKey = generateTestSigningKeyPair("handoff856-issuer");
    const anchorKey = generateTestSigningKeyPair("handoff856-anchor");
    const statusSignerKey = generateTestSigningKeyPair("handoff856-status");
    Object.assign(process.env, registryEnv(receiptKey, anchorKey, process.env), {
      ABRAXAS_STATUS_SIGNER_KEY_ID: statusSignerKey.signingKeyId,
      ABRAXAS_STATUS_SIGNER_PRIVATE_JWK: JSON.stringify(statusSignerKey.privateKeyJwk),
      ABRAXAS_STATUS_SIGNER_PUBLIC_JWK: JSON.stringify(statusSignerKey.publicKeyJwk),
      VERCEL_ENV: "development",
    });

    const dbName = "abraxas_handoff856_primary";
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
       values ($1,$2,1,'handoff856','{}','active') on conflict (id, version) do nothing`,
      [POLICY, PARTNER],
    );
    await pool.query(
      `insert into public.issuer_signing_keys (signing_key_id, status) values ($1,'active') on conflict do nothing`,
      [receiptKey.signingKeyId],
    );
    for (const appId of [APP_A, APP_B]) {
      await pool.query(
        `insert into public.partner_launchpad_applications (id, partner_id, status, policy_id, policy_version)
         values ($1::uuid,$2,'active',$3,1) on conflict (id) do update set partner_id = excluded.partner_id`,
        [appId, PARTNER, POLICY],
      );
    }
    kp = Keypair.generate();
    wallet = kp.publicKey.toBase58();
    const walletSession = await import("@/lib/auth/ephemeralWallet/walletSession");
    vi.mocked(walletSession.requireEphemeralWalletScope).mockResolvedValue({
      ok: true,
      session: {
        sessionId: "sess_handoff856",
        walletAddress: wallet,
        solanaNetwork: "devnet",
        scopes: ["wallet:session"],
      },
    });
  }, 120_000);

  afterAll(async () => {
    resetSovereignStagingPgPoolForTests();
    await pool?.end().catch(() => undefined);
  });

  it("runs hosted handoff → continue-context → authorize+evaluate HTTP", async () => {
    const handoff = await createSovereignHostedTrustHandoff({
      partnerId: PARTNER,
      applicationId: APP_A,
      holderWalletAddress: wallet,
      origin: "https://ci.abraxas.test",
      solanaNetwork: "devnet",
    });
    expect(handoff.ok).toBe(true);
    if (!handoff.ok) return;

    const ctxReq = new NextRequest(
      `https://ci.abraxas.test/api/v1/hosted-handoff/continue-context?verify_request=${encodeURIComponent(handoff.handoff.verify_request)}`,
    );
    const ctxRes = await continueContextGET(ctxReq);
    expect(ctxRes.status).toBe(200);
    const ctxBody = await ctxRes.json();
    expect(ctxBody.sovereign_trust_execution).toBe(true);
    expect(ctxBody.application_id).toBe(APP_A);

    const row = await loadScopedTrustChallenge(handoff.handoff.challenge_id);
    const signature = signWalletScopedTrustMessage(row!.message, kp);
    const authorizeReq = new NextRequest("https://ci.abraxas.test/api/v1/partner-flow/trust-execution/authorize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challenge_id: handoff.handoff.challenge_id,
        signature,
        solana_network: "devnet",
      }),
    });
    const authorizeRes = await authorizePOST(authorizeReq);
    expect(authorizeRes.status).toBe(200);
    const authorizeBody = await authorizeRes.json();
    expect(authorizeBody.evaluation_continued).toBe(true);
    expect(authorizeBody.execution?.ok).toBe(true);
    expect(authorizeBody.execution?.receipt_id).toBeTruthy();

    const material = authorizeBody.execution.independent_verification_material;
    const anchor = buildDemoTrustAnchorFromEnv(process.env);
    expect(anchor).toBeTruthy();
    if (material && anchor) {
      const independent = verifyTrustExecutionMaterial({
        material,
        pinnedTrustAnchor: anchor,
        partnerId: PARTNER,
        policyId: POLICY,
      });
      expect(independent.cryptographically_authentic).toBe(true);
    }

    const retry = await executePartnerTrustExecutionJourney({
      partnerId: PARTNER,
      applicationId: APP_A,
      challengeId: handoff.handoff.challenge_id,
    });
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    expect(retry.journey.receipt_id).toBe(authorizeBody.execution.receipt_id);
  });

  it("rejects cross-application journey access under same partner", async () => {
    const handoff = await createSovereignHostedTrustHandoff({
      partnerId: PARTNER,
      applicationId: APP_A,
      holderWalletAddress: wallet,
      origin: "https://ci.abraxas.test",
      solanaNetwork: "devnet",
    });
    expect(handoff.ok).toBe(true);
    if (!handoff.ok) return;
    const cross = await loadPartnerTrustExecutionJourney({
      partnerId: PARTNER,
      applicationId: APP_B,
      challengeId: handoff.handoff.challenge_id,
    });
    expect(cross.ok).toBe(false);
    if (cross.ok) return;
    expect(cross.code).toBe("application_mismatch");
  });

  it("rejects replay on authorize", async () => {
    const handoff = await createSovereignHostedTrustHandoff({
      partnerId: PARTNER,
      applicationId: APP_A,
      holderWalletAddress: wallet,
      origin: "https://ci.abraxas.test",
      solanaNetwork: "devnet",
    });
    expect(handoff.ok).toBe(true);
    if (!handoff.ok) return;
    const row = await loadScopedTrustChallenge(handoff.handoff.challenge_id);
    const signature = signWalletScopedTrustMessage(row!.message, kp);
    const first = await authorizePartnerTrustExecution({
      challengeId: handoff.handoff.challenge_id,
      walletAddress: wallet,
      signature,
      solanaNetwork: "devnet",
    });
    expect(first.ok).toBe(true);
    const second = await authorizePartnerTrustExecution({
      challengeId: handoff.handoff.challenge_id,
      walletAddress: wallet,
      signature,
      solanaNetwork: "devnet",
    });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.code).toBe("replay");
  });

  it("preserves legacy evaluate route export", () => {
    expect(typeof evaluatePOST).toBe("function");
  });
});
