import { describe, expect, it } from "vitest";
import {
  evaluateMethodQualification,
  qualificationMatchesBinding,
} from "./partnerMethodQualification";

const SANDBOX = {
  methodId: "privacy_preserving",
  storedPartnerId: "circle-arc-demo-304",
  storedPolicyId: "circle-arc-demo-304-sandbox_economic_demo-v1",
  storedPolicyVersion: 1,
  verifyRequestId: "vr-sandbox-1",
};

const RETAIL = {
  methodId: "privacy_preserving",
  storedPartnerId: "good-trouble-cannabis",
  storedPolicyId: "good-trouble-retail-v1",
  storedPolicyVersion: 2,
  verifyRequestId: "vr-retail-1",
};

describe("evaluateMethodQualification", () => {
  it("qualifies sandbox_economic_demo without ID and never issues a receipt", () => {
    const result = evaluateMethodQualification(SANDBOX);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.record.qualified).toBe(true);
    expect(result.record.issuedReceipt).toBe(false);
    expect(result.record.sandboxOnly).toBe(true);
    expect(result.record.methodId).toBe("privacy_preserving");
  });

  it("rejects selection-equivalent methods that cannot qualify", () => {
    expect(evaluateMethodQualification({ ...SANDBOX, methodId: "account_login" }).code).toBe(
      "login_is_not_eligibility",
    );
    expect(evaluateMethodQualification({ ...SANDBOX, methodId: "self_attestation" }).code).toBe(
      "self_attestation_cannot_qualify",
    );
  });

  it("rejects sandbox methods against an authoritative policy", () => {
    const result = evaluateMethodQualification(RETAIL);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("sandbox_evidence_rejected");
    expect(result.issuedReceipt).toBe(false);
  });

  it("rejects identity_liveness until server-side identity evidence is complete", () => {
    const result = evaluateMethodQualification({ ...RETAIL, methodId: "identity_liveness" });
    expect(result.code).toBe("identity_not_complete");
    expect(evaluateMethodQualification({
      ...RETAIL,
      methodId: "identity_liveness",
      identityEvidenceComplete: true,
    }).ok).toBe(true);
  });

  it("keeps partner/policy/version tenant binding on a sandbox qualification", () => {
    const result = evaluateMethodQualification({
      ...SANDBOX,
      claimedPartnerId: SANDBOX.storedPartnerId,
      claimedPolicyId: SANDBOX.storedPolicyId,
      claimedPolicyVersion: 1,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.record.partnerId).toBe(SANDBOX.storedPartnerId);
    expect(result.record.policyId).toBe(SANDBOX.storedPolicyId);
    expect(result.record.policyVersion).toBe(1);
  });

  it("rejects claimed partner, policy, or version that do not match the stored continuation", () => {
    expect(evaluateMethodQualification({
      ...SANDBOX,
      claimedPartnerId: "other-partner",
    }).code).toBe("cross_partner");
    expect(evaluateMethodQualification({
      ...SANDBOX,
      claimedPolicyId: "other-policy",
    }).code).toBe("altered_policy");
    expect(evaluateMethodQualification({
      ...SANDBOX,
      claimedPolicyVersion: 99,
    }).code).toBe("altered_version");
  });
});

describe("qualificationMatchesBinding", () => {
  it("rejects stale, cross-policy, and replayed qualification records", () => {
    const qualified = evaluateMethodQualification(SANDBOX);
    expect(qualified.ok).toBe(true);
    if (!qualified.ok) return;
    expect(qualificationMatchesBinding({
      record: qualified.record,
      verifyRequestId: SANDBOX.verifyRequestId,
      partnerId: SANDBOX.storedPartnerId,
      policyId: SANDBOX.storedPolicyId,
      policyVersion: 1,
    })).toBe(true);
    expect(qualificationMatchesBinding({
      record: qualified.record,
      verifyRequestId: "vr-other",
      partnerId: SANDBOX.storedPartnerId,
      policyId: SANDBOX.storedPolicyId,
    })).toBe(false);
    expect(qualificationMatchesBinding({
      record: qualified.record,
      verifyRequestId: SANDBOX.verifyRequestId,
      partnerId: SANDBOX.storedPartnerId,
      policyId: RETAIL.storedPolicyId,
    })).toBe(false);
    expect(qualificationMatchesBinding({
      record: { ...qualified.record, issuedReceipt: false, qualified: false },
      verifyRequestId: SANDBOX.verifyRequestId,
      partnerId: SANDBOX.storedPartnerId,
      policyId: SANDBOX.storedPolicyId,
    })).toBe(false);
  });
});
