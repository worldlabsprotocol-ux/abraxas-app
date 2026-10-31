import { afterEach, describe, expect, it } from "vitest";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { runPartnerHarnessCase } from "@/lib/partner/launchpad/partnerTestHarness";
import { verifyStoredHarnessReceipt } from "./verifyStoredHarnessReceipt";

describe("stored harness receipt integrity", () => {
  const originalPublicKey = process.env.ABRAXAS_PUBLIC_KEY;
  const originalKeyId = process.env.ABRAXAS_SIGNING_KEY_ID;
  afterEach(() => {
    if (originalPublicKey === undefined) delete process.env.ABRAXAS_PUBLIC_KEY;
    else process.env.ABRAXAS_PUBLIC_KEY = originalPublicKey;
    if (originalKeyId === undefined) delete process.env.ABRAXAS_SIGNING_KEY_ID;
    else process.env.ABRAXAS_SIGNING_KEY_ID = originalKeyId;
  });

  it("verifies a current signed receipt and rejects payload or signature tampering", () => {
    const key = generateTestSigningKeyPair("harness-test-key");
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(key.publicKeyJwk);
    process.env.ABRAXAS_SIGNING_KEY_ID = key.signingKeyId;
    const result = runPartnerHarnessCase({
      partnerId: "partner-acme", policyId: "partner-acme-wallet_control-v1",
      policyVersion: 1, policyTemplateId: "wallet_control", scenarioId: "approved",
      signingKey: key, now: new Date(),
    });
    if ("ok" in result || !result.persistence) throw new Error("harness did not issue a receipt");
    const { public_payload: payload, signature } = result.persistence;
    expect(verifyStoredHarnessReceipt(payload, signature).signatureValid).toBe(true);
    expect(verifyStoredHarnessReceipt({ ...payload, policy_id: "other-policy" }, signature).signatureValid).toBe(false);
    expect(verifyStoredHarnessReceipt(payload, "invalid-signature").signatureValid).toBe(false);
    expect(verifyStoredHarnessReceipt({ ...payload, verification_decision_id: undefined }, signature).signatureValid).toBe(false);
  });
});
