import { describe, expect, it } from "vitest";
import { GOOD_TROUBLE_PARTNER_ID } from "@/lib/goodTrouble/constants";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { evaluatePublicReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import { outcomeFromValidationErrors } from "@/lib/partner/integrationKit/outcomes";
import { portableReasonFromOutcome } from "@/lib/partner/portableActionContract/preflight";
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { evaluateMethodQualification } from "@/lib/partner/partnerMethodQualification";
import {
  catalogAllowsReuse,
  evaluateFactCompatibility,
} from "@/lib/passport/reusableEligibility/compatibility";
import {
  REUSE_CLIENT_KEYS,
  REUSE_COMPATIBILITY_RULE,
  REUSE_LIFECYCLE_RULE,
  REUSE_PASSPORT_NOTICE,
} from "@/lib/passport/reusableEligibility/contract";
import { projectInternalFact, type SourceReceiptRow } from "@/lib/passport/reusableEligibility/facts";
import { derivedClaimRefs, derivedReceiptLeaksSource } from "@/lib/passport/reusableEligibility/issue";
import { buildReuseClientView, rejectReuseClientAuthority } from "@/lib/passport/reusableEligibility/view";
import { buildPassportActivityItem } from "@/lib/passport/verificationActivity/view";

const SUBJECT = "0x" + "a".repeat(64);
const OTHER = "0x" + "b".repeat(64);
const SOURCE_RECEIPT = "dr_source_reuse_1";
const SOURCE_DECISION = "00000000-0000-4000-8000-0000000000aa";

function receipt(overrides: Partial<SourceReceiptRow> = {}): SourceReceiptRow {
  return {
    id: SOURCE_RECEIPT,
    verification_decision_id: SOURCE_DECISION,
    partner_id: "origin-partner",
    policy_id: "partner-age_21_retail-v1",
    policy_version: 1,
    subject_pseudonym_id: subjectPseudonymId(SUBJECT),
    decision_result: "approved",
    decision_context: "production",
    evaluated_at: "2026-09-01T00:00:00.000Z",
    expires_at: "2026-12-01T00:00:00.000Z",
    revoked_at: null,
    status: "active",
    ...overrides,
  };
}

describe("consent-bound reusable eligibility facts", () => {
  it("documents exact pack+version compatibility and derived invalidation", () => {
    expect(REUSE_COMPATIBILITY_RULE).toBe("exact_pack_and_version_or_reviewed_catalog");
    expect(REUSE_LIFECYCLE_RULE).toBe("source_withdrawal_invalidates_derived_future_checks");
    expect(catalogAllowsReuse({
      sourcePackId: "age_21_retail",
      sourceVersion: 1,
      targetPackId: "age_21_retail",
      targetVersion: 1,
    })).toBe(true);
    expect(catalogAllowsReuse({
      sourcePackId: "age_21_retail",
      sourceVersion: 1,
      targetPackId: "age_18_retail",
      targetVersion: 1,
    })).toBe(false);
    expect(catalogAllowsReuse({
      sourcePackId: "age_21_retail",
      sourceVersion: 1,
      targetPackId: "age_21_retail",
      targetVersion: 2,
    })).toBe(false);
  });

  it("does not infer age, residency, membership, identity, or sandbox equivalence", () => {
    expect(catalogAllowsReuse({
      sourcePackId: "age_21_retail",
      sourceVersion: 1,
      targetPackId: "residency_us",
      targetVersion: 1,
    })).toBe(false);
    expect(catalogAllowsReuse({
      sourcePackId: "age_21_retail",
      sourceVersion: 1,
      targetPackId: "membership_credential",
      targetVersion: 1,
    })).toBe(false);
    expect(catalogAllowsReuse({
      sourcePackId: "identity_liveness",
      sourceVersion: 1,
      targetPackId: "age_21_retail",
      targetVersion: 1,
    })).toBe(false);
    expect(catalogAllowsReuse({
      sourcePackId: "sandbox_economic_demo",
      sourceVersion: 1,
      targetPackId: "age_21_retail",
      targetVersion: 1,
    })).toBe(false);
  });

  it("returns no compatible fact when the holder has none", () => {
    expect(projectInternalFact({ subjectId: SUBJECT, receipt: receipt({ decision_result: "denied" }) })).toBeNull();
    const view = buildReuseClientView("none");
    expect(view.available).toBe(false);
    expect(view.issuedReceipt).toBe(false);
    expect(Object.keys(view).sort()).toEqual([...REUSE_CLIENT_KEYS].sort());
  });

  it("accepts an exact compatible current fact", () => {
    const fact = projectInternalFact({ subjectId: SUBJECT, receipt: receipt() })!;
    const check = evaluateFactCompatibility({
      fact,
      targetPolicyId: "other-partner-age_21_retail-v1",
      targetPolicyVersion: 1,
      targetSandboxOnly: false,
      now: new Date("2026-09-20T00:00:00.000Z"),
    });
    expect(check.ok).toBe(true);
    const view = buildReuseClientView("available");
    expect(view.available).toBe(true);
    expect(view.consent_still_required).toBe(true);
    expect(view.explanation.join(" ")).toMatch(/does not issue a result/i);
    expect(JSON.stringify(view)).not.toContain(SOURCE_RECEIPT);
    expect(JSON.stringify(view)).not.toContain("origin-partner");
    expect(JSON.stringify(view)).not.toContain(fact.fact_id);
  });

  it("rejects incompatible policy or version", () => {
    const fact = projectInternalFact({ subjectId: SUBJECT, receipt: receipt() })!;
    expect(evaluateFactCompatibility({
      fact,
      targetPolicyId: "partner-age_18_retail-v1",
      targetPolicyVersion: 1,
      targetSandboxOnly: false,
    }).ok).toBe(false);
    expect(evaluateFactCompatibility({
      fact,
      targetPolicyId: "partner-age_21_retail-v1",
      targetPolicyVersion: 9,
      targetSandboxOnly: false,
    }).ok).toBe(false);
  });

  it("rejects expired, revoked, and sandbox facts for Production", () => {
    const expired = projectInternalFact({
      subjectId: SUBJECT,
      receipt: receipt({ status: "expired", expires_at: "2026-01-01T00:00:00.000Z" }),
      now: new Date("2026-09-20T00:00:00.000Z"),
    })!;
    expect(evaluateFactCompatibility({
      fact: expired,
      targetPolicyId: "partner-age_21_retail-v1",
      targetPolicyVersion: 1,
      targetSandboxOnly: false,
    })).toMatchObject({ ok: false, reason: "expired" });

    const revoked = projectInternalFact({
      subjectId: SUBJECT,
      receipt: receipt({ status: "revoked", revoked_at: "2026-09-02T00:00:00.000Z" }),
    })!;
    expect(evaluateFactCompatibility({
      fact: revoked,
      targetPolicyId: "partner-age_21_retail-v1",
      targetPolicyVersion: 1,
      targetSandboxOnly: false,
    })).toMatchObject({ ok: false, reason: "revoked" });

    const sandbox = projectInternalFact({
      subjectId: SUBJECT,
      receipt: receipt({
        decision_context: "sandbox_only",
      }),
    })!;
    expect(evaluateFactCompatibility({
      fact: sandbox,
      targetPolicyId: "partner-age_21_retail-v1",
      targetPolicyVersion: 1,
      targetSandboxOnly: false,
    })).toMatchObject({ ok: false, reason: "sandbox_blocked" });
  });

  it("requires a compatible fact before reuse qualification and never issues on selection", () => {
    const denied = evaluateMethodQualification({
      methodId: "reuse_existing_proof",
      verifyRequestId: "vr-1",
      storedPartnerId: "partner-b",
      storedPolicyId: "partner-age_21_retail-v1",
      storedPolicyVersion: 1,
      existingProofCompatible: false,
    });
    expect(denied.ok).toBe(false);

    const ok = evaluateMethodQualification({
      methodId: "reuse_existing_proof",
      verifyRequestId: "vr-1",
      storedPartnerId: "partner-b",
      storedPolicyId: "partner-age_21_retail-v1",
      storedPolicyVersion: 1,
      existingProofCompatible: true,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.record.issuedReceipt).toBe(false);
      expect(ok.record.qualified).toBe(true);
    }
  });

  it("rejects browser fact, source receipt, compatibility, and production fields", () => {
    expect(rejectReuseClientAuthority({
      method_id: "reuse_existing_proof",
      fact_id: "fact_abc",
      source_receipt_id: SOURCE_RECEIPT,
    })).toBe(true);
    expect(rejectReuseClientAuthority({
      method_id: "reuse_existing_proof",
      verify_request: "vr-1",
    })).toBe(false);
  });

  it("builds a derived partner-bound result without source identifiers", () => {
    const fact = projectInternalFact({ subjectId: SUBJECT, receipt: receipt() })!;
    const refs = derivedClaimRefs(fact, "partner-b-age_21_retail-v1");
    const publicLike = {
      partner_id: "partner-b",
      policy_id: "partner-b-age_21_retail-v1",
      policy_version: 1,
      decision_result: "approved",
      status: "active",
      reason_codes: ["all_claims_met"],
      evaluated_claim_refs: refs,
    };
    expect(derivedReceiptLeaksSource(publicLike, fact)).toBe(false);
    expect(JSON.stringify(publicLike)).not.toContain(SOURCE_RECEIPT);
    expect(JSON.stringify(publicLike)).not.toContain("origin-partner");
    expect(JSON.stringify(publicLike)).not.toContain(fact.fact_id);
    expect(publicLike.partner_id).toBe("partner-b");
  });

  it("treats a derived current receipt as a normal partner-bound result until revoked", () => {
    const publicView = {
      receipt_id: "dr_derived_1",
      schema_version: "1.0.0",
      partner_id: "partner-b",
      policy_id: "partner-age_21_retail-v1",
      policy_version: 1,
      decision_result: "approved" as const,
      signature_valid: true,
      expires_at: "2026-12-01T00:00:00.000Z",
      status: "active",
      production_usable: true,
      decision_context: "production" as const,
      currently_valid: true,
      validity: "valid",
      invalidation_reasons: [] as string[],
      artifact_type: "eligibility_decision_receipt",
      payload_hash: "abc",
      signature: "sig",
      signing_key_id: "k",
      evaluated_at: "2026-09-20T00:00:00.000Z",
      reason_codes: ["all_claims_met"],
      issuer_refs: ["issuer:abraxas"],
      subject_pseudonym_id: subjectPseudonymId(SUBJECT),
    };
    const partnerValidation = validatePartnerFlowPublicReceipt(publicView, {
      partnerId: "partner-b",
      policyId: "partner-age_21_retail-v1",
      now: new Date("2026-09-21T00:00:00.000Z"),
    });
    expect(partnerValidation.ok).toBe(true);
  });

  it("invalidates derived results for future checks after source withdrawal", () => {
    const revokedView = {
      receipt_id: "dr_derived_1",
      schema_version: "1.0.0",
      partner_id: "partner-b",
      policy_id: "partner-age_21_retail-v1",
      policy_version: 1,
      decision_result: "approved" as const,
      signature_valid: true,
      expires_at: "2026-12-01T00:00:00.000Z",
      status: "revoked",
      production_usable: true,
      decision_context: "production" as const,
      currently_valid: false,
      validity: "revoked",
      invalidation_reasons: ["receipt_revoked"],
      artifact_type: "eligibility_decision_receipt",
      payload_hash: "abc",
      signature: "sig",
      signing_key_id: "k",
      evaluated_at: "2026-09-20T00:00:00.000Z",
      reason_codes: ["all_claims_met"],
      issuer_refs: ["issuer:abraxas"],
      subject_pseudonym_id: subjectPseudonymId(SUBJECT),
    };
    const trust = evaluatePublicReceiptTrust(revokedView, {
      partnerId: "partner-b",
      policyId: "partner-age_21_retail-v1",
      now: new Date("2026-09-21T00:00:00.000Z"),
    });
    const partnerValidation = validatePartnerFlowPublicReceipt(revokedView, {
      partnerId: "partner-b",
      policyId: "partner-age_21_retail-v1",
      now: new Date("2026-09-21T00:00:00.000Z"),
    });
    const kit = outcomeFromValidationErrors(partnerValidation.ok ? [] : partnerValidation.errors);
    expect(trust.currently_valid).toBe(false);
    expect(kit).toBe("revoked");
    expect(portableReasonFromOutcome(kit)).toBe("receipt_revoked");
  });

  it("scopes facts to the session subject and keeps Passport copy source-blind", () => {
    const item = buildPassportActivityItem({
      decision_id: SOURCE_DECISION,
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: "partner-age_21_retail-v1",
      policy_version: 1,
      decision: "approved",
      decided_at: "2026-09-19T12:00:00.000Z",
      valid_until: "2026-12-01T00:00:00.000Z",
      decision_status: "active",
      requested_action: "Confirm adult retail eligibility",
      receipt_status: "active",
      receipt_context: "production",
      receipt_expires_at: "2026-12-01T00:00:00.000Z",
      receipt_revoked_at: null,
    }, SUBJECT, new Date("2026-09-20T12:00:00.000Z"));
    expect(item?.reuse_consent_notice).toBe(REUSE_PASSPORT_NOTICE);
    expect(item?.reuse_consent_notice).not.toMatch(/partner-b|future partner list/i);
    expect(JSON.stringify(item)).not.toContain(SOURCE_RECEIPT);
    expect(subjectPseudonymId(SUBJECT)).not.toBe(subjectPseudonymId(OTHER));
  });
});
