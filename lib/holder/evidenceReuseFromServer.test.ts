import { describe, expect, it } from "vitest";
import { holderEvidenceReuseHintFromServer } from "@/lib/holder/evidenceReuseFromServer";

describe("evidenceReuseFromServer", () => {
  it("maps available server reuse to consent-only holder outcome", () => {
    const hint = holderEvidenceReuseHintFromServer({
      reuseState: "available",
      serverDecision: {
        decision: "reuse",
        reason: "trust_satisfied",
        assurance_level: "L2",
        freshness_state: "fresh",
        trust: {
          reusable: true,
          freshness: "fresh",
          reasons: [],
          environment_allowed: true,
          source_active: true,
          assurance_sufficient: true,
          compatibility: "exact",
          consent_required: true,
        },
      },
      consentGrantedForRequest: false,
    });
    expect(hint.outcome).toBe("request_consent_only");
    expect(hint.source).toBe("server_reuse_lookup");
  });

  it("maps revoked state to deny_revoked", () => {
    const hint = holderEvidenceReuseHintFromServer({
      reuseState: "revoked",
      serverDecision: null,
    });
    expect(hint.outcome).toBe("deny_revoked");
  });
});
