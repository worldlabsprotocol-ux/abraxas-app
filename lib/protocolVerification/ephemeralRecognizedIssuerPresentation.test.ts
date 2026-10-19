// FILE: lib/protocolVerification/ephemeralRecognizedIssuerPresentation.test.ts

import { describe, expect, it } from "vitest";
import { evaluateEphemeralRecognizedIssuerPresentation } from "./ephemeralRecognizedIssuerPresentation.server";
import {
  buildEphemeralSandboxAgeTestCredential,
  EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ENV,
  ephemeralSandboxTestIssuerTrustEnv,
} from "./ephemeralAuthorizedTestIssuer";
import {
  build566SyntheticReusableCredential,
  build566TrustEnv,
  buildFreshPortableRevocationSnapshotForCredential,
} from "@/lib/passport/reusableCredential/fixtures";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";

const TEST_WALLET = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuQos6UqK";

describe("ephemeralRecognizedIssuerPresentation", () => {
  it("accepts authorized test issuer credential for age policy when enabled", async () => {
    const bundle = buildEphemeralSandboxAgeTestCredential({ walletAddress: TEST_WALLET });
    const result = await evaluateEphemeralRecognizedIssuerPresentation({
      credential: bundle.credential,
      portable_revocation_snapshot: bundle.portable_revocation_snapshot,
      walletAddress: TEST_WALLET,
      policyId: "age_21_retail",
      context: "sandbox_only",
      env: {
        ...ephemeralSandboxTestIssuerTrustEnv(),
        [EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ENV]: "1",
      },
    });
    expect(result.ok).toBe(true);
  });

  it("rejects recognized issuer credential when claim types do not satisfy age policy", async () => {
    const credential = build566SyntheticReusableCredential({
      holderSubjectId: subjectPseudonymId(TEST_WALLET),
    });
    const snapshot = buildFreshPortableRevocationSnapshotForCredential(credential.payload.credential_id);
    const result = await evaluateEphemeralRecognizedIssuerPresentation({
      credential,
      portable_revocation_snapshot: snapshot,
      walletAddress: TEST_WALLET,
      policyId: "age_21_retail",
      context: "sandbox_only",
      env: {
        ...build566TrustEnv(),
        ABRAXAS_PSEUDONYM_SALT: "test-759",
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("missing_required_claim");
  });

  it("rejects sandbox test issuer in production context", async () => {
    const bundle = buildEphemeralSandboxAgeTestCredential({ walletAddress: TEST_WALLET });
    const result = await evaluateEphemeralRecognizedIssuerPresentation({
      credential: bundle.credential,
      portable_revocation_snapshot: bundle.portable_revocation_snapshot,
      walletAddress: TEST_WALLET,
      policyId: "age_21_retail",
      context: "production",
      env: ephemeralSandboxTestIssuerTrustEnv(),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("sandbox_issuer_not_production_trusted");
  });

  it("requires wallet holder binding via pseudonym for test issuer credentials", async () => {
    const bundle = buildEphemeralSandboxAgeTestCredential({ walletAddress: TEST_WALLET });
    const wrongWallet = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
    expect(subjectPseudonymId(TEST_WALLET)).not.toBe(subjectPseudonymId(wrongWallet));
    const result = await evaluateEphemeralRecognizedIssuerPresentation({
      credential: bundle.credential,
      portable_revocation_snapshot: bundle.portable_revocation_snapshot,
      walletAddress: wrongWallet,
      policyId: "age_21_retail",
      context: "sandbox_only",
      env: {
        ...ephemeralSandboxTestIssuerTrustEnv(),
        [EPHEMERAL_SANDBOX_AUTHORIZED_TEST_ISSUER_ENV]: "1",
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("credential_holder_mismatch");
  });
});
