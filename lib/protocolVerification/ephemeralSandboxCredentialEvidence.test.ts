// FILE: lib/protocolVerification/ephemeralSandboxCredentialEvidence.test.ts

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeProtocolVerification, bindVerificationRequest } from "./executeVerification";
import {
  buildEphemeralSandboxAgeTestCredential,
  EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ENV,
  ephemeralSandboxTestIssuerTrustEnv,
} from "./ephemeralAuthorizedTestIssuer";
import { evaluatePassportCredentialEvidence } from "./evaluatePassportCredentialEvidence";
import { evaluateEvidencePresentation } from "./evidenceAdapters";
import { verifyReceiptIndependently } from "@/lib/institutionalCertification/build546/independentVerifier";
import { build546TrustRegistryEnv } from "@/lib/institutionalCertification/build546/fixtures";

const TEST_WALLET = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuQos6UqK";
const TEST_ENV = {
  ...build546TrustRegistryEnv(),
  ...ephemeralSandboxTestIssuerTrustEnv(),
  [EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ENV]: "1",
  ABRAXAS_PSEUDONYM_SALT: "test-salt-756",
};

describe("ephemeral sandbox credential evidence", () => {
  const previousEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
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
  });
  it("materializes identity_verified claims from test issuer credential", async () => {
    const bundle = buildEphemeralSandboxAgeTestCredential({ walletAddress: TEST_WALLET });
    const evaluated = await evaluatePassportCredentialEvidence({
      credential: bundle.credential,
      portable_revocation_snapshot: bundle.portable_revocation_snapshot,
      walletSubject: TEST_WALLET,
      policyId: "age_21_retail",
      context: "sandbox_only",
      env: TEST_ENV,
    });
    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) return;
    expect(evaluated.materialized_claims.length).toBeGreaterThan(0);
    expect(evaluated.materialized_claims[0]?.claim_type).toBe("identity_verified");
  });

  it("approves age_21_retail with authorized test issuer credential", async () => {
    const bundle = buildEphemeralSandboxAgeTestCredential({ walletAddress: TEST_WALLET });
    const request = bindVerificationRequest({
      requestId: "req_test_age",
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
    expect(outcome.reason_codes).toContain("policy_satisfied");
    expect(outcome.decision).toBe("approved");
    expect(outcome.result_label).toBe("ephemeral_sandbox_test_only");
    expect(outcome.receipt.production_usable).toBe(false);
  });

  it("rejects wallet-only age verification", async () => {
    const request = bindVerificationRequest({
      requestId: "req_wallet_only",
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
      evidence: [{ kind: "wallet_session_binding", wallet_address: TEST_WALLET }],
    });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.code).toBe("insufficient_evidence_for_policy");
  });

  it("rejects invalid issuer credentials", async () => {
    const bundle = buildEphemeralSandboxAgeTestCredential({
      walletAddress: TEST_WALLET,
      variant: "invalid_issuer",
    });
    const evaluated = await evaluatePassportCredentialEvidence({
      credential: bundle.credential,
      portable_revocation_snapshot: bundle.portable_revocation_snapshot,
      walletSubject: TEST_WALLET,
      policyId: "age_21_retail",
      context: "sandbox_only",
      env: TEST_ENV,
    });
    expect(evaluated.ok).toBe(false);
  });

  it("rejects tampered credentials", async () => {
    const bundle = buildEphemeralSandboxAgeTestCredential({
      walletAddress: TEST_WALLET,
      variant: "tampered",
    });
    const evaluated = await evaluatePassportCredentialEvidence({
      credential: bundle.credential,
      portable_revocation_snapshot: bundle.portable_revocation_snapshot,
      walletSubject: TEST_WALLET,
      policyId: "age_21_retail",
      context: "sandbox_only",
      env: TEST_ENV,
    });
    expect(evaluated.ok).toBe(false);
    if (evaluated.ok) return;
    expect(evaluated.code).toBe("credential_signature_invalid");
  });

  it("rejects expired credentials", async () => {
    const bundle = buildEphemeralSandboxAgeTestCredential({
      walletAddress: TEST_WALLET,
      variant: "expired",
    });
    const evaluated = await evaluatePassportCredentialEvidence({
      credential: bundle.credential,
      portable_revocation_snapshot: bundle.portable_revocation_snapshot,
      walletSubject: TEST_WALLET,
      policyId: "age_21_retail",
      context: "sandbox_only",
      env: TEST_ENV,
    });
    expect(evaluated.ok).toBe(false);
  });

  it("rejects revoked credentials", async () => {
    const bundle = buildEphemeralSandboxAgeTestCredential({
      walletAddress: TEST_WALLET,
      variant: "revoked",
    });
    const evaluated = await evaluatePassportCredentialEvidence({
      credential: bundle.credential,
      portable_revocation_snapshot: bundle.portable_revocation_snapshot,
      walletSubject: TEST_WALLET,
      policyId: "age_21_retail",
      context: "sandbox_only",
      env: TEST_ENV,
    });
    expect(evaluated.ok).toBe(false);
  });

  it("rejects wrong holder binding", async () => {
    const bundle = buildEphemeralSandboxAgeTestCredential({
      walletAddress: TEST_WALLET,
      variant: "wrong_holder",
    });
    const evaluated = await evaluatePassportCredentialEvidence({
      credential: bundle.credential,
      portable_revocation_snapshot: bundle.portable_revocation_snapshot,
      walletSubject: TEST_WALLET,
      policyId: "age_21_retail",
      context: "sandbox_only",
      env: TEST_ENV,
    });
    expect(evaluated.ok).toBe(false);
    if (evaluated.ok) return;
    expect(evaluated.code).toBe("credential_holder_mismatch");
  });

  it("blocks sandbox test issuer in production context", async () => {
    const bundle = buildEphemeralSandboxAgeTestCredential({ walletAddress: TEST_WALLET });
    const adapter = await evaluateEvidencePresentation({
      presentation: {
        kind: "passport_reusable_credential",
        credential: bundle.credential,
        portable_revocation_snapshot: bundle.portable_revocation_snapshot,
      },
      partnerId: "partner-live",
      policyId: "age_21_retail",
      walletSubject: TEST_WALLET,
      context: "production",
    });
    expect(adapter.ok).toBe(false);
    if (adapter.ok) return;
    expect(adapter.code).toBe("sandbox_issuer_not_production_trusted");
  });

  it("independent verifier distinguishes signature authentic from currently acceptable", async () => {
    const bundle = buildEphemeralSandboxAgeTestCredential({ walletAddress: TEST_WALLET });
    const request = bindVerificationRequest({
      requestId: "req_indep",
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
    const independent = verifyReceiptIndependently({
      publicReceipt: outcome.receipt as never,
      expectations: {
        partnerId: "ephemeral_wallet_sandbox",
        policyId: "age_21_retail",
        allowSandbox: true,
      },
    });
    expect(independent.cryptographically_authentic).toBe(true);
    if (outcome.decision === "approved") {
      expect(independent.verdict).not.toBe("reject");
    }
    expect(independent.checks_possible_offline.length).toBeGreaterThan(0);
  });
});
