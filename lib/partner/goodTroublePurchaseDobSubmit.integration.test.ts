// FILE: lib/partner/goodTroublePurchaseDobSubmit.integration.test.ts
// Regression: Good Trouble purchase DOB Continue must not fail on purpose=purchase.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import { GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES } from "@/lib/goodTrouble/pilotAgeEligibilityPolicy";
import { evaluateMethodQualification } from "@/lib/partner/partnerMethodQualification";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { selfAttestationRowToClaim } from "@/lib/assurance/selfAttestation/selfAttestationClaims";
import { submitSelfAttestation } from "@/lib/assurance/selfAttestation/submitSelfAttestation";
import { policyPackRequiresIdentityEvidence } from "@/lib/partner/launchpad/policyPacks";
import { policyRequiresIdentityEvidenceForPurchase } from "@/lib/goodTrouble/pilotAgeEligibilityPolicy";

const HOLDER = normalizeSuiAddress("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd");

const mockGetPolicy = vi.fn();
const mockInsertSelfAttestationRecord = vi.fn();

vi.mock("@/lib/verification/requestsService", () => ({
  getPolicy: (...args: unknown[]) => mockGetPolicy(...args),
}));

vi.mock("@/lib/assurance/selfAttestation/selfAttestationLedger", () => ({
  generateBrowseReceiptId: () => "br_test",
  insertSelfAttestationRecord: (...args: unknown[]) => mockInsertSelfAttestationRecord(...args),
}));

vi.mock("@/lib/assurance/selfAttestation/browseReceipt", () => ({
  buildBrowseReceiptPayload: (payload: unknown) => payload,
  signBrowseAccessReceipt: vi.fn(),
}));

vi.mock("@/lib/assurance/selfAttestation/selfAttestationAudit", () => ({
  emitSelfAttestationAuditEvent: vi.fn(),
}));

describe("Good Trouble purchase DOB submit integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPolicy.mockResolvedValue({
      id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      version: 2,
      rules_json: GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES,
    });
    mockInsertSelfAttestationRecord.mockResolvedValue({
      ok: true,
      row: {
        id: "ledger-row-1",
        holder_ref: HOLDER,
        partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
        policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
        age_band: "over_21",
        assurance_level: "L0",
        provenance: "user_self_attestation",
        purpose: "purchase",
        attested_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        revoked_at: null,
        browse_receipt_id: null,
        created_at: new Date().toISOString(),
      },
    });
  });

  it("1. POST /api/age-assurance/self-attest equivalent succeeds for 11/11/1999", async () => {
    const result = await submitSelfAttestation({
      dateOfBirth: "1999-11-11",
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      purpose: "purchase",
      holderRef: HOLDER,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.age_band).toBe("over_21");
    expect(result.assurance_level).toBe("L0");
    expect(result.valid_for_purchase).toBe(true);
  });

  it("2. persisted evidence is self_attested_age_band L0 purchase — no DOB field", async () => {
    await submitSelfAttestation({
      dateOfBirth: "1999-11-11",
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      purpose: "purchase",
      holderRef: HOLDER,
    });
    const insertArg = mockInsertSelfAttestationRecord.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(insertArg).toMatchObject({
      ageBand: "over_21",
      purpose: "purchase",
      browseReceiptId: null,
    });
    expect(insertArg).not.toHaveProperty("dateOfBirth");
    expect(JSON.stringify(insertArg)).not.toMatch(/1999-11-11/);
  });

  it("3. method qualification accepts self_attestation after attest", () => {
    const qual = evaluateMethodQualification({
      methodId: "self_attestation",
      storedPartnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      storedPolicyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      storedPolicyVersion: 2,
      verifyRequestId: "vr-gt-1",
      policyRules: GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES,
      selfAttestationActive: true,
    });
    expect(qual.ok).toBe(true);
    if (!qual.ok) return;
    expect(qual.record.methodId).toBe("self_attestation");
  });

  it("4. rejects identity_liveness for pilot policy", () => {
    const qual = evaluateMethodQualification({
      methodId: "identity_liveness",
      storedPartnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      storedPolicyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      verifyRequestId: "vr-gt-1",
      policyRules: GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES,
      identityEvidenceComplete: true,
    });
    expect(qual.ok).toBe(false);
  });

  it("5. policy evaluation approves L0 claim for v2 rules", () => {
    const claim = selfAttestationRowToClaim({
      id: "ledger-row-1",
      holder_ref: HOLDER,
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      age_band: "over_21",
      assurance_level: "L0",
      provenance: "user_self_attestation",
      purpose: "purchase",
      attested_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      revoked_at: null,
      browse_receipt_id: null,
      created_at: new Date().toISOString(),
    });
    const evaluation = evaluatePolicyRules(GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES, [claim], {
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      policyRules: GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES,
    });
    expect(evaluation.decision).toBe("approved");
    expect(evaluation.production_usable).toBe(true);
    expect(evaluation.missing_claims).not.toContain("identity_verified");
  });

  it("6. under-21 DOB fails eligibility", async () => {
    const result = await submitSelfAttestation({
      dateOfBirth: "2010-11-11",
      partnerId: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      policyId: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      purpose: "purchase",
      holderRef: HOLDER,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.age_band).toBe("under_21");
  });

  it("7. unrelated L2 retail pack still requires identity evidence", () => {
    const inferred = policyPackRequiresIdentityEvidence;
    const pack = { required_claims: ["identity_verified"] as const, rules: {} };
    expect(inferred(pack as never)).toBe(true);
    expect(policyRequiresIdentityEvidenceForPurchase(GOOD_TROUBLE_PILOT_AGE_ELIGIBILITY_RULES)).toBe(false);
  });
});
