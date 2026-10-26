import { describe, expect, it } from "vitest";
import { deriveEvidenceIntegrityVerdict } from "./evidenceIntegrityContract";

describe("deriveEvidenceIntegrityVerdict", () => {
  it("accepts authoritative source and active claims", () => {
    const result = deriveEvidenceIntegrityVerdict({
      receipt_id: "dr_1",
      subject_pseudonym_id: "sub_a",
      expected_subject_pseudonym_id: "sub_a",
      partner_id: "p1",
      policy_id: "pol",
      store_available: true,
      source: {
        source_credential_id: "dr_src",
        status: "active",
        expires_at: "2099-01-01T00:00:00.000Z",
        revoked_at: null,
      },
      claims: [{ claim_id: "clm_1", status: "active", expires_at: "2099-01-01T00:00:00.000Z" }],
    });
    expect(result.verdict).toBe("accepted");
  });

  it("denies revoked source evidence", () => {
    const result = deriveEvidenceIntegrityVerdict({
      receipt_id: "dr_1",
      subject_pseudonym_id: "sub_a",
      expected_subject_pseudonym_id: "sub_a",
      partner_id: "p1",
      policy_id: "pol",
      store_available: true,
      source: {
        source_credential_id: "dr_src",
        status: "revoked",
        expires_at: null,
        revoked_at: "2026-01-01T00:00:00.000Z",
      },
      claims: [{ claim_id: "clm_1", status: "active", expires_at: null }],
    });
    expect(result.verdict).toBe("denied");
    expect(result.reasons).toContain("source_evidence_revoked");
  });

  it("denies subject mismatch", () => {
    const result = deriveEvidenceIntegrityVerdict({
      receipt_id: "dr_1",
      subject_pseudonym_id: "sub_a",
      expected_subject_pseudonym_id: "sub_b",
      partner_id: "p1",
      policy_id: "pol",
      store_available: true,
      source: {
        source_credential_id: "dr_src",
        status: "active",
        expires_at: null,
        revoked_at: null,
      },
      claims: [{ claim_id: "clm_1", status: "active", expires_at: null }],
    });
    expect(result.verdict).toBe("denied");
    expect(result.reasons).toContain("subject_mismatch");
  });
});
