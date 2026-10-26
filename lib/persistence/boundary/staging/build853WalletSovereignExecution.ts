// FILE: lib/persistence/boundary/staging/build853WalletSovereignExecution.ts
// Build #853 — sovereign PG + wallet-scoped authorization + independent verify.

import type { Pool } from "pg";
import { Keypair } from "@solana/web3.js";
import { randomUUID } from "node:crypto";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { evaluateSovereignCurrentValidity } from "../sovereignCurrentValidity/evaluate";
import { publishSignedIssuerAuthorityFromRegistry } from "../issuerAuthority/buildFromRegistry";
import { registryEnv, syntheticSandboxReceipt } from "./build834Fixtures";
import { applySovereignSliceSchema, seedSovereignSliceFixtures } from "../sovereignSlice/bootstrap";
import { executeWalletSovereignTrustPath } from "@/lib/protocolExecution/walletSovereignTrustPath";

export type Build853ScenarioResult = {
  id: string;
  verdict: "pass" | "fail";
  detail: string;
};

export type Build853WalletSovereignReport = {
  build: "853";
  execution_tier: "ci_disposable_contract";
  capabilities_reused: string[];
  trust_dependencies_isolated: string[];
  scenarios: Build853ScenarioResult[];
  generated_at: string;
};

const APP_ID = "00000000-0000-4000-8000-000000008853";

async function seedApplicationBinding(pool: Pool, record: ReturnType<typeof syntheticSandboxReceipt>) {
  await pool.query(
    `insert into public.partner_launchpad_applications (id, partner_id, status, policy_id, policy_version)
     values ($1::uuid, $2, 'active', $3, 1)
     on conflict (id) do update set status = excluded.status`,
    [APP_ID, record.partner_id, record.policy_id],
  );
  await pool.query(
    `insert into public.partner_launchpad_signed_receipts (receipt_id, application_id, partner_id, revoked_at)
     values ($1, $2::uuid, $3, null)
     on conflict (receipt_id) do update set application_id = excluded.application_id`,
    [record.id, APP_ID, record.partner_id],
  );
}

export async function runBuild853WalletSovereignExecution(input: {
  primaryPool: Pool;
  env: Record<string, string | undefined>;
}): Promise<Build853WalletSovereignReport> {
  const scenarios: Build853ScenarioResult[] = [];
  const receiptKey = generateTestSigningKeyPair("build853-issuer");
  const anchorKey = generateTestSigningKeyPair("build853-anchor");
  const statusSignerKey = generateTestSigningKeyPair("build853-status");
  const baseEnv = {
    ...registryEnv(receiptKey, anchorKey, input.env),
    ABRAXAS_STATUS_SIGNER_KEY_ID: statusSignerKey.signingKeyId,
    ABRAXAS_STATUS_SIGNER_PRIVATE_JWK: JSON.stringify(statusSignerKey.privateKeyJwk),
    ABRAXAS_STATUS_SIGNER_PUBLIC_JWK: JSON.stringify(statusSignerKey.publicKeyJwk),
  };
  const record = syntheticSandboxReceipt(receiptKey);

  await applySovereignSliceSchema(input.primaryPool);
  await seedSovereignSliceFixtures({ pool: input.primaryPool, record, env: baseEnv });
  await seedApplicationBinding(input.primaryPool, record);

  async function runScenario(id: string, fn: () => Promise<void>) {
    try {
      await fn();
      scenarios.push({ id, verdict: "pass", detail: "ok" });
    } catch (e) {
      scenarios.push({
        id,
        verdict: "fail",
        detail: e instanceof Error ? e.message : "error",
      });
    }
  }

  const kp = Keypair.generate();

  await runScenario("wallet_scoped_authorization_independent_verify", async () => {
    const path = await executeWalletSovereignTrustPath({
      binding: {
        domain: "ci.abraxas.test",
        audience: "abraxas_wallet_trust_execution",
        walletAddress: kp.publicKey.toBase58(),
        uri: "https://ci.abraxas.test/trust",
        solanaNetwork: "devnet",
        nonce: randomUUID(),
        issuedAt: "2026-06-01T00:00:00.000Z",
        expiresAt: "2099-06-01T00:00:00.000Z",
        requestId: `wsc_${randomUUID()}`,
        origin: "https://ci.abraxas.test",
        partnerId: record.partner_id,
        applicationId: APP_ID,
        action: "partner_flow:evaluate",
        resource: "abraxas:trust:evaluate",
        policyId: record.policy_id,
      },
      evidence: {
        label: "controlled_test_evidence",
        source: {
          source_credential_id: "cred_build853",
          status: "active",
          expires_at: "2099-01-01T00:00:00.000Z",
          revoked_at: null,
        },
        claim_ids: ["claim_build853"],
      },
      receipt: record,
      receiptKey,
      anchorKey,
      env: baseEnv,
      walletKeypair: kp,
    });
    if (path.independent_verification.currently_acceptable !== "yes") {
      throw new Error("independent_verifier_not_acceptable");
    }
  });

  await runScenario("sovereign_current_validity_with_application_scope", async () => {
    const signedIssuer = publishSignedIssuerAuthorityFromRegistry({
      registryVersion: 853,
      anchorKeyId: "build834-trust-anchor",
      anchorPrivateJwk: anchorKey.privateKeyJwk,
      env: baseEnv,
    });
    if (!("payload" in signedIssuer)) throw new Error(signedIssuer.reason);
    const evaluation = await evaluateSovereignCurrentValidity({
      record,
      signedIssuerAuthority: signedIssuer,
      trustAnchorPublicJwk: anchorKey.publicKeyJwk,
      expectedEnvironment: "demo",
      expectedApplicationId: APP_ID,
      expectedPartnerId: record.partner_id,
      expectedPolicyId: record.policy_id,
      env: baseEnv,
    });
    if (!evaluation.currently_acceptable) {
      throw new Error(evaluation.invalidation_reasons.join(","));
    }
  });

  await runScenario("wrong_application_fails_sovereign_validity", async () => {
    const signedIssuer = publishSignedIssuerAuthorityFromRegistry({
      registryVersion: 854,
      anchorKeyId: "build834-trust-anchor",
      anchorPrivateJwk: anchorKey.privateKeyJwk,
      env: baseEnv,
    });
    if (!("payload" in signedIssuer)) throw new Error(signedIssuer.reason);
    const evaluation = await evaluateSovereignCurrentValidity({
      record,
      signedIssuerAuthority: signedIssuer,
      trustAnchorPublicJwk: anchorKey.publicKeyJwk,
      expectedEnvironment: "demo",
      expectedApplicationId: "00000000-0000-4000-8000-000000009999",
      expectedPartnerId: record.partner_id,
      expectedPolicyId: record.policy_id,
      env: baseEnv,
    });
    if (evaluation.currently_acceptable) {
      throw new Error("expected_application_scope_deny");
    }
  });

  await runScenario("independent_verify_no_supabase_admin", async () => {
    const { verifyThreeLayerPortableFixture } = await import("./build834Fixtures");
    const result = await verifyThreeLayerPortableFixture({
      record,
      env: baseEnv,
      anchorKey,
      registryVersion: 853,
    });
    if (!result.cryptographically_authentic) throw new Error("signature_failed");
  });

  return {
    build: "853",
    execution_tier: "ci_disposable_contract",
    capabilities_reused: [
      "lib/auth/ephemeralWallet/protocolEnvelope.ts",
      "lib/decisionReceipts/evidenceIntegrityContract.ts",
      "lib/persistence/boundary/sovereignCurrentValidity/evaluate.ts",
      "packages/abraxas-independent-verifier",
      "lib/persistence/boundary/staging/build834Fixtures.ts (verifyThreeLayer)",
    ],
    trust_dependencies_isolated: [
      "Wallet challenge consume (in-memory store; sovereign PG path parallel to native Solana RPC)",
      "Independent verification verdict (no requireSupabaseAdmin on verify path)",
      "Evidence permit gate before receipt trust execution (controlled test fixtures in CI)",
    ],
    scenarios,
    generated_at: new Date().toISOString(),
  };
}
