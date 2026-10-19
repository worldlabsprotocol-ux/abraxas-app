// FILE: lib/protocolVerification/sandboxPresentationSecurity.test.ts

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildEphemeralSandboxAgeTestCredential,
  EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ENV,
  ephemeralSandboxTestIssuerTrustEnv,
  isSandboxTestIssuerRuntimeAllowed,
} from "./ephemeralAuthorizedTestIssuer";
import { hashSandboxCredentialPresentationBundle } from "./sandboxPresentationBinding";
import { verifySandboxPresentationCommitAgainstSubmission } from "./verifySandboxPresentationCommit";
import {
  consumeSandboxPresentationCommit,
  resetSandboxPresentationCommitStoreForTests,
  storeSandboxPresentationCommit,
} from "@/lib/auth/ephemeralWallet/sandboxPresentationCommitStore";
import { executeProtocolVerification, bindVerificationRequest } from "./executeVerification";
import { build546TrustRegistryEnv } from "@/lib/institutionalCertification/build546/fixtures";

const TEST_WALLET = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuQos6UqK";
const TEST_WALLET_B = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

const TEST_ENV = {
  ...build546TrustRegistryEnv(),
  ...ephemeralSandboxTestIssuerTrustEnv(),
  [EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ENV]: "1",
  ABRAXAS_PSEUDONYM_SALT: "test-salt-756-security",
};

describe("sandbox presentation security", () => {
  const previousEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    resetSandboxPresentationCommitStoreForTests();
    for (const [key, value] of Object.entries(TEST_ENV)) {
      previousEnv[key] = process.env[key];
      process.env[key] = value;
    }
  });

  afterEach(() => {
    for (const key of Object.keys(TEST_ENV)) {
      if (previousEnv[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnv[key];
    }
    delete process.env.VERCEL_ENV;
  });

  it("rejects evidence substitution against stored presentation commit", async () => {
    const bundleA = buildEphemeralSandboxAgeTestCredential({ walletAddress: TEST_WALLET });
    const bundleB = buildEphemeralSandboxAgeTestCredential({ walletAddress: TEST_WALLET_B });
    const hashA = hashSandboxCredentialPresentationBundle({
      policy_id: "age_21_retail",
      policy_version: 1,
      workspace_id: "ws_1",
      wallet_address: TEST_WALLET,
      credential: bundleA.credential,
      portable_revocation_snapshot: bundleA.portable_revocation_snapshot,
    });
    await storeSandboxPresentationCommit({
      commit_id: "esbx_pc_test",
      session_id: "sess_a",
      workspace_id: "ws_1",
      wallet_address: TEST_WALLET,
      policy_id: "age_21_retail",
      policy_version: 1,
      presentation_method_id: "authorized_test_issuer_credential",
      evidence_hash: hashA,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      sandbox_labeled: true,
      production_trusted: false,
    });
    const commit = await consumeSandboxPresentationCommit("esbx_pc_test");
    const result = verifySandboxPresentationCommitAgainstSubmission({
      commit,
      session_id: "sess_a",
      workspace_id: "ws_1",
      wallet_address: TEST_WALLET,
      policy_id: "age_21_retail",
      policy_version: 1,
      credential: bundleB.credential,
      portable_revocation_snapshot: bundleB.portable_revocation_snapshot,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("presentation_evidence_mismatch");
  });

  it("rejects cross-policy credential substitution at evaluation", async () => {
    const bundle = buildEphemeralSandboxAgeTestCredential({ walletAddress: TEST_WALLET });
    const request = bindVerificationRequest({
      requestId: "req_cross_policy",
      partnerId: "ephemeral_wallet_sandbox",
      policyId: "wallet_control",
      policyVersion: 1,
      operation: "sandbox:verification:test",
      resource: "abraxas:sandbox:ws:policy:wallet_control",
      walletAddress: TEST_WALLET,
    });
    const outcome = await executeProtocolVerification({
      context: "sandbox_only",
      request,
      evidence: [
        {
          kind: "passport_reusable_credential",
          credential: bundle.credential,
          portable_revocation_snapshot: bundle.portable_revocation_snapshot,
        },
      ],
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.decision).toBe("denied");
  });

  it("blocks sandbox test issuer when VERCEL_ENV is production", () => {
    process.env.VERCEL_ENV = "production";
    expect(isSandboxTestIssuerRuntimeAllowed()).toBe(false);
  });

  it("consumes presentation commit only once", async () => {
    await storeSandboxPresentationCommit({
      commit_id: "esbx_pc_once",
      session_id: "sess_a",
      workspace_id: "ws_1",
      wallet_address: TEST_WALLET,
      policy_id: "age_21_retail",
      policy_version: 1,
      presentation_method_id: "authorized_test_issuer_credential",
      evidence_hash: "abc",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      sandbox_labeled: true,
      production_trusted: false,
    });
    expect(await consumeSandboxPresentationCommit("esbx_pc_once")).not.toBeNull();
    expect(await consumeSandboxPresentationCommit("esbx_pc_once")).toBeNull();
  });

  it("serializes concurrent in-process presentation commit consumption (single winner)", async () => {
    await storeSandboxPresentationCommit({
      commit_id: "esbx_pc_race",
      session_id: "sess_a",
      workspace_id: "ws_1",
      wallet_address: TEST_WALLET,
      policy_id: "age_21_retail",
      policy_version: 1,
      presentation_method_id: "authorized_test_issuer_credential",
      evidence_hash: "race",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      sandbox_labeled: true,
      production_trusted: false,
    });
    const results = await Promise.all([
      consumeSandboxPresentationCommit("esbx_pc_race"),
      consumeSandboxPresentationCommit("esbx_pc_race"),
    ]);
    expect(results.filter((r) => r !== null)).toHaveLength(1);
  });

  it("policy execution validates issuer trust and revocation (hash binding is not sufficient)", async () => {
    const revoked = buildEphemeralSandboxAgeTestCredential({
      walletAddress: TEST_WALLET,
      variant: "revoked",
    });
    const request = bindVerificationRequest({
      requestId: "req_revoked_at_execution",
      partnerId: "ephemeral_wallet_sandbox",
      policyId: "age_21_retail",
      policyVersion: 1,
      operation: "sandbox:verification:test",
      resource: "abraxas:sandbox:ws:policy:age_21_retail",
      walletAddress: TEST_WALLET,
    });
    const outcome = await executeProtocolVerification({
      context: "sandbox_only",
      request,
      evidence: [
        {
          kind: "passport_reusable_credential",
          credential: revoked.credential,
          portable_revocation_snapshot: revoked.portable_revocation_snapshot,
        },
      ],
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.decision).toBe("denied");
    expect(outcome.reason_codes).not.toContain("policy_satisfied");
  });

  it("policy execution rejects untrusted issuer even when evidence shape matches", async () => {
    const bundle = buildEphemeralSandboxAgeTestCredential({
      walletAddress: TEST_WALLET,
      variant: "invalid_issuer",
    });
    const request = bindVerificationRequest({
      requestId: "req_bad_issuer",
      partnerId: "ephemeral_wallet_sandbox",
      policyId: "age_21_retail",
      policyVersion: 1,
      operation: "sandbox:verification:test",
      resource: "abraxas:sandbox:ws:policy:age_21_retail",
      walletAddress: TEST_WALLET,
    });
    const outcome = await executeProtocolVerification({
      context: "sandbox_only",
      request,
      evidence: [
        {
          kind: "passport_reusable_credential",
          credential: bundle.credential,
          portable_revocation_snapshot: bundle.portable_revocation_snapshot,
        },
      ],
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.decision).toBe("denied");
  });
});
