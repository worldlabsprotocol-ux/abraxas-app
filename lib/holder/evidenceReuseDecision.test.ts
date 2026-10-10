import { describe, expect, it } from "vitest";
import { decideEvidenceReuse } from "@/lib/holder/evidenceReuseDecision";

describe("evidenceReuseDecision", () => {
  it("reuses when qualified and consented", () => {
    const d = decideEvidenceReuse({
      hasQualifiedEvidence: true,
      evidenceExpired: false,
      evidenceRevoked: false,
      higherAssuranceRequired: false,
      consentGranted: true,
    });
    expect(d.outcome).toBe("reuse_without_recollection");
  });

  it("requests consent only when evidence qualifies", () => {
    const d = decideEvidenceReuse({
      hasQualifiedEvidence: true,
      evidenceExpired: false,
      evidenceRevoked: false,
      higherAssuranceRequired: false,
      consentGranted: false,
    });
    expect(d.outcome).toBe("request_consent_only");
  });
});
