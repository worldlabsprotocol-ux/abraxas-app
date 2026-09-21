import { describe, expect, it } from "vitest";
import { deriveReleaseShape } from "@/lib/partner/policyReleaseCandidate/sanitize";
import type { SanitizedProposalPayload } from "@/lib/partner/policyProposal/sanitize";
import { HOLDER_APPROVED_METHOD, NO_VERIFIED_METHOD } from "./contract";
import { issuerRecordIsCurrent, matchesReleaseShape, planIssuersForReleaseShape } from "./match";
import { projectIssuerTrustRegistry } from "./project";
import { issuerTrustClientOverride } from "./csrf";
import { VERIFICATION_ISSUER_TRUST_RECORDS } from "./registry";
import { issuerTrustLeaks } from "./match";

const proposal: SanitizedProposalPayload = {
  action: "retail_access",
  result_needed: "age_21",
  partner_receives: ["eligibility_result"],
  stays_private: ["date_of_birth", "holder_wallet"],
  environment: "sandbox",
  platform: "http_generic",
  capabilities: ["reusable_result"],
};

function shape(overrides: Record<string, unknown> = {}) {
  return deriveReleaseShape(proposal, {
    confirm: true,
    action: "retail_access",
    result_category: "age_21",
    shared_result: ["eligibility_result"],
    withheld: ["date_of_birth"],
    method_category: "reuse_existing_proof",
    minimum_assurance: "L1",
    environment: "sandbox",
    action_scopes: ["sandbox:protocol_access"],
    disclosure_profile: "result_only",
    compatibility_impact: "policy_review",
    policy_label: "reviewed_gate_age_21",
    ...overrides,
  })!;
}

describe("verification issuer trust registry", () => {
  it("classifies active, retiring, disabled, review-required, expired, and planned records", () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    const byKey = Object.fromEntries(VERIFICATION_ISSUER_TRUST_RECORDS.map((record) => [record.issuer_key, record]));
    expect(byKey["abraxas.reusable_eligibility"]?.status).toBe("active");
    expect(issuerRecordIsCurrent(byKey["abraxas.reusable_eligibility"]!, now)).toBe(true);
    expect(byKey["legacy.veriff"]?.status).toBe("retiring");
    expect(byKey["fixture.disabled"]?.status).toBe("disabled");
    expect(byKey["abraxas.verify_identity.production"]?.status).toBe("review_required");
    expect(issuerRecordIsCurrent(byKey["fixture.expired"]!, now)).toBe(false);
    expect(byKey["reclaim.privacy_preserving"]?.integration).toBe("planned");
    expect(byKey["abraxas.organization_eligibility"]?.method_category).toBe("privacy_preserving");
    expect(byKey["abraxas.organization_eligibility"]?.assurance_level).toBe("L2");
    expect(byKey["abraxas.google_account"]?.status).toBe("disabled");
  });

  it("matches an accepted reuse candidate and refuses weaker fallbacks", () => {
    const reuse = planIssuersForReleaseShape(shape());
    expect(reuse.can_ready_for_review).toBe(true);
    expect(reuse.holder_notice).toBe(HOLDER_APPROVED_METHOD);
    expect(reuse.entries.every((entry) => entry.partner_selectable === false)).toBe(true);

    const missing = planIssuersForReleaseShape(shape({
      method_category: "privacy_preserving",
      minimum_assurance: "L3",
      environment: "future_production",
    }));
    expect(missing.can_ready_for_review).toBe(false);
    expect(missing.no_verified_method).toBe(true);
    expect(missing.holder_notice).toBe(NO_VERIFIED_METHOD);
    expect(missing.entries).toHaveLength(0);

    const expired = VERIFICATION_ISSUER_TRUST_RECORDS.find((record) => record.issuer_key === "fixture.expired")!;
    expect(matchesReleaseShape(expired, shape({ method_category: "privacy_preserving", minimum_assurance: "L3" }))).toBe(false);
    const google = VERIFICATION_ISSUER_TRUST_RECORDS.find((record) => record.issuer_key === "abraxas.google_account")!;
    expect(matchesReleaseShape(google, shape())).toBe(false);
  });

  it("projects allowlisted fields and rejects browser authority", () => {
    const view = projectIssuerTrustRegistry();
    expect(JSON.stringify(view)).not.toMatch(/issuer_key|oauth|callback_url|abx_live_/);
    expect(issuerTrustLeaks(view)).toEqual([]);
    expect(issuerTrustClientOverride({ issuer_id: "vit_x", activate_mainnet: true })).toBe(true);
    expect(view.items.every((item) => item.partner_selectable === false)).toBe(true);
    expect(view.browser_can_publish).toBe(false);
  });
});
