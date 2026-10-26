/**
 * Build #854 — live partner trust execution HTTP/service integration (disposable PG).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { Keypair } from "@solana/web3.js";
import { applySovereignSliceSchema } from "@/lib/persistence/boundary/sovereignSlice/bootstrap";
import { resetSovereignStagingPgPoolForTests } from "@/lib/persistence/boundary/sovereignStagingPg";
import {
  authorizePartnerTrustExecution,
  issuePartnerTrustExecutionChallenge,
} from "./partnerTrustExecutionService";
import { executeTrustExecutionDecision } from "./executeTrustExecutionDecision";
import { signWalletScopedTrustMessage } from "@/lib/protocolExecution/walletSovereignTrustPath";
import { loadScopedTrustChallenge } from "@/lib/auth/walletAuthorization/scopedChallengePostgresStore";
import { POST as challengePOST } from "@/app/api/v1/partner-flow/trust-execution/challenge/route";
import { POST as authorizePOST } from "@/app/api/v1/partner-flow/trust-execution/authorize/route";
import { POST as executePOST } from "@/app/api/v1/partner-flow/trust-execution/execute/route";
import { NextRequest } from "next/server";
import { vi } from "vitest";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { registryEnv } from "@/lib/persistence/boundary/staging/build834Fixtures";

const PROOF = process.env.ABRAXAS_SOVEREIGN_OPERATIONAL_PROOF === "1";
const describeProof = PROOF ? describe : describe.skip;

const PARTNER = "partner-build854";
const APP_ID = "00000000-0000-4000-8000-000000008854";
const POLICY = "policy-build854";

vi.mock("@/lib/partner/partnerAuth", () => ({
  authenticatePartnerScoped: vi.fn(async () => ({
    ok: true,
    ctx: { partnerId: PARTNER, keyPrefix: "abx_test" },
  })),
}));

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication.server", () => ({
  getLaunchpadApplicationById: vi.fn(async () => ({
    id: APP_ID,
    partner_id: PARTNER,
    environment: "sandbox",
    status: "active",
  })),
  getLaunchpadApplicationForPartner: vi.fn(async () => ({
    id: APP_ID,
    partner_id: PARTNER,
    environment: "sandbox",
    status: "active",
  })),
}));

vi.mock("@/lib/auth/ephemeralWallet/walletSession", () => ({
  requireEphemeralWalletScope: vi.fn(async () => ({
    ok: true,
    session: { walletAddress: "", solanaNetwork: "devnet" },
  })),
}));

describeProof("Build #854 partner trust execution HTTP", () => {
  let pool: pg.Pool;
  let kp: Keypair;
  let wallet: string;

  beforeAll(async () => {
    process.env.ABRAXAS_SOVEREIGN_ENV_CLASS = "disposable";
    process.env.ABRAXAS_SOVEREIGN_STAGING_FIXTURE_WRITES = "true";
    process.env.ABRAXAS_TRUST_EXECUTION_CONTROLLED_TEST_EVIDENCE = "1";
    process.env.ABRAXAS_TRUST_EXECUTION_FIXTURE_ATTESTATION = "disposable_ci_only";
    process.env.VERCEL_ENV = "development";

    const receiptKey = generateTestSigningKeyPair("build854-issuer");
    const anchorKey = generateTestSigningKeyPair("build854-anchor");
    const statusSignerKey = generateTestSigningKeyPair("build854-status");
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

    const dbName = "abraxas_build854_primary";
    const admin = new pg.Pool({
      connectionString: `postgresql://postgres:postgres@127.0.0.1:5432/postgres`,
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
    await pool.query(`insert into public.partners (partner_id, status) values ($1,'active') on conflict do nothing`, [
      PARTNER,
    ]);
    await pool.query(
      `insert into public.partner_policies (id, partner_id, version, name, rules_json, status)
       values ($1,$2,1,'build854-trust-exec','{}','active')
       on conflict (id, version) do nothing`,
      [POLICY, PARTNER],
    );
    await pool.query(
      `insert into public.issuer_signing_keys (signing_key_id, status) values ($1,'active')
       on conflict (signing_key_id) do nothing`,
      [receiptKey.signingKeyId],
    );
    await pool.query(
      `insert into public.partner_launchpad_applications (id, partner_id, status, policy_id, policy_version)
       values ($1::uuid,$2,'active',$3,1) on conflict (id) do update set partner_id = excluded.partner_id`,
      [APP_ID, PARTNER, POLICY],
    );
    kp = Keypair.generate();
    wallet = kp.publicKey.toBase58();
    const walletSession = await import("@/lib/auth/ephemeralWallet/walletSession");
    vi.mocked(walletSession.requireEphemeralWalletScope).mockResolvedValue({
      ok: true,
      session: { walletAddress: wallet, solanaNetwork: "devnet" },
    });
  }, 120_000);

  afterAll(async () => {
    resetSovereignStagingPgPoolForTests();
    await pool?.end().catch(() => undefined);
  });

  async function authorizeFreshChallenge() {
    const issued = await issuePartnerTrustExecutionChallenge({
      partnerId: PARTNER,
      applicationId: APP_ID,
      holderWalletAddress: wallet,
      origin: "https://ci.abraxas.test",
      uri: "https://ci.abraxas.test/trust",
      solanaNetwork: "devnet",
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) throw new Error("issue failed");
    const row = await loadScopedTrustChallenge(issued.challenge_id);
    const signature = signWalletScopedTrustMessage(row!.message, kp);
    const authorized = await authorizePartnerTrustExecution({
      challengeId: issued.challenge_id,
      walletAddress: wallet,
      signature,
      solanaNetwork: "devnet",
    });
    expect(authorized.ok).toBe(true);
    if (!authorized.ok) throw new Error("authorize failed");
    return authorized;
  }

  it("runs challenge → authorize → execute with verification material (no server verdict)", async () => {
    const authorized = await authorizeFreshChallenge();
    const executed = await executeTrustExecutionDecision({
      partnerId: PARTNER,
      authorizationRef: authorized.authorization_ref,
      controlledTestEvidence: true,
    });
    if (!executed.ok) {
      throw new Error(`execute failed: ${executed.code} (${executed.decision_result ?? ""})`);
    }
    expect(executed.evidence_mode).toBe("controlled_test_evidence");
    expect(executed.verification_material.portable_receipt.id).toBe(executed.receipt.id);
    expect(executed.verification_material.signed_issuer_authority).toBeTruthy();
    expect(executed.verification_material.signed_status_statement).toBeTruthy();
    expect(executed).not.toHaveProperty("independent_verification");
  });

  it("rejects concurrent replay on authorize", async () => {
    const issued = await issuePartnerTrustExecutionChallenge({
      partnerId: PARTNER,
      applicationId: APP_ID,
      holderWalletAddress: wallet,
      origin: "https://ci.abraxas.test",
      uri: "https://ci.abraxas.test/trust",
      solanaNetwork: "devnet",
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    const row = await loadScopedTrustChallenge(issued.challenge_id);
    const signature = signWalletScopedTrustMessage(row!.message, kp);

    const [first, second] = await Promise.all([
      authorizePartnerTrustExecution({
        challengeId: issued.challenge_id,
        walletAddress: wallet,
        signature,
        solanaNetwork: "devnet",
      }),
      authorizePartnerTrustExecution({
        challengeId: issued.challenge_id,
        walletAddress: wallet,
        signature,
        solanaNetwork: "devnet",
      }),
    ]);
    const successes = [first, second].filter((r) => r.ok).length;
    expect(successes).toBe(1);
  });

  it("binds one authorization_ref to one receipt on concurrent execute", async () => {
    const authorized = await authorizeFreshChallenge();
    const [a, b] = await Promise.all([
      executeTrustExecutionDecision({
        partnerId: PARTNER,
        authorizationRef: authorized.authorization_ref,
        controlledTestEvidence: true,
      }),
      executeTrustExecutionDecision({
        partnerId: PARTNER,
        authorizationRef: authorized.authorization_ref,
        controlledTestEvidence: true,
      }),
    ]);
    const okResults = [a, b].filter((r) => r.ok);
    expect(okResults.length).toBe(2);
    if (okResults.length !== 2) return;
    expect(okResults[0]!.receipt.id).toBe(okResults[1]!.receipt.id);
  });

  it("fail-closes live authoritative path without evidence", async () => {
    const authorized = await authorizeFreshChallenge();
    const executed = await executeTrustExecutionDecision({
      partnerId: PARTNER,
      authorizationRef: authorized.authorization_ref,
      controlledTestEvidence: false,
    });
    expect(executed.ok).toBe(false);
    if (executed.ok) return;
    expect(["denied", "indeterminate"]).toContain(executed.decision_result);
  });

  it("exercises HTTP route handlers", async () => {
    const challengeReq = new NextRequest("https://ci.abraxas.test/api/v1/partner-flow/trust-execution/challenge", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-abraxas-application-id": APP_ID,
        authorization: "Bearer abx_test",
      },
      body: JSON.stringify({ holder_wallet_address: wallet, solana_network: "devnet" }),
    });
    const challengeRes = await challengePOST(challengeReq);
    expect(challengeRes.status).toBe(200);
    const challengeBody = await challengeRes.json();
    expect(challengeBody.ok).toBe(true);

    const row = await loadScopedTrustChallenge(challengeBody.challenge_id);
    const signature = signWalletScopedTrustMessage(row!.message, kp);
    const authorizeReq = new NextRequest("https://ci.abraxas.test/api/v1/partner-flow/trust-execution/authorize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challenge_id: challengeBody.challenge_id,
        signature,
        solana_network: "devnet",
      }),
    });
    const authorizeRes = await authorizePOST(authorizeReq);
    expect(authorizeRes.status).toBe(200);
    const authorizeBody = await authorizeRes.json();
    expect(authorizeBody.authorization_ref).toMatch(/^waev_/);

    const executeReq = new NextRequest("https://ci.abraxas.test/api/v1/partner-flow/trust-execution/execute", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-abraxas-application-id": APP_ID,
        authorization: "Bearer abx_test",
      },
      body: JSON.stringify({ authorization_ref: authorizeBody.authorization_ref }),
    });
    const executeRes = await executePOST(executeReq);
    expect(executeRes.status).toBe(200);
    const executeBody = await executeRes.json();
    expect(executeBody.independent_verification_material.portable_receipt).toBeTruthy();
    expect(executeBody.portable_verification).toBeUndefined();
    expect(executeBody.relying_party_note).toMatch(/pinned trust anchor/i);
  });
});
