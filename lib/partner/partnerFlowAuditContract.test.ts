import { describe, expect, it } from "vitest";
import {
  buildPartnerFlowAuditMetadata,
  findPartnerFlowAuditMetadataPiiViolations,
  normalizePartnerFlowAuditMetadata,
  PARTNER_FLOW_AUDIT_METADATA_KEYS,
  safeIdempotencyKeyForAudit,
  sanitizePartnerFlowAuditError,
} from "@/lib/partner/partnerFlowAuditContract";

describe("partnerFlowAuditContract", () => {
  it("builds canonical metadata shape", () => {
    const metadata = buildPartnerFlowAuditMetadata({
      flowTraceId: "ft_vr_test",
      partnerId: "good-trouble-cannabis",
      policyId: "good-trouble-retail-v1",
      policyVersion: 1,
      verificationRequestId: "vr-1",
      decisionId: "vd-1",
      receiptId: "dr-1",
      outcome: "enter",
      validity: "active",
      currentlyValid: true,
      replayStatus: "issued",
      idempotencyKey: "pf_vr:vr-1",
      reasonCodes: ["approved"],
    });

    for (const key of PARTNER_FLOW_AUDIT_METADATA_KEYS) {
      expect(metadata).toHaveProperty(key);
    }
    expect(metadata.idempotency_key).toBe("pf_vr:vr-1");
  });

  it("omits session idempotency keys that embed subject identity", () => {
    expect(safeIdempotencyKeyForAudit("pf_vr:00000000-0000-4000-8000-0000000000aa")).toBe(
      "pf_vr:00000000-0000-4000-8000-0000000000aa",
    );
    expect(
      safeIdempotencyKeyForAudit("pf_session:partner:0xsubject:policy"),
    ).toBeNull();
  });

  it("flags PII-like metadata keys and values", () => {
    const violations = findPartnerFlowAuditMetadataPiiViolations({
      flow_trace_id: "ft_test",
      email: "user@example.com",
      credential_jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature",
    });
    expect(violations).toContain("forbidden_key:email");
    expect(violations).toContain("forbidden_key:credential_jwt");
    expect(violations.some(v => v.startsWith("jwt_like_value:"))).toBe(true);
  });
});

describe("partnerFlowAuditContract sanitization", () => {
  it("maps known errors to stable safe codes", () => {
    expect(sanitizePartnerFlowAuditError("flow_trace_id does not match verification_request_id"))
      .toBe("flow_trace_id_mismatch");
    expect(sanitizePartnerFlowAuditError("idempotency_conflict:stored decision identity", "idempotency_conflict"))
      .toBe("idempotency_conflict");
  });

  it("replaces unsafe error text at write time", () => {
    const metadata = normalizePartnerFlowAuditMetadata({
      flowTraceId: "ft_test",
      partnerId: "partner",
      policyId: "policy",
      outcome: "error",
      error: "holder@example.com failed with 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    });

    expect(metadata.error).toBe("generic_error");
    expect(Object.keys(metadata)).not.toContain("email");
  });

  it("omits forbidden metadata keys and unsafe idempotency keys", () => {
    const built = buildPartnerFlowAuditMetadata({
      flowTraceId: "ft_test",
      partnerId: "partner",
      policyId: "policy",
      outcome: "enter",
      idempotencyKey: "pf_session:partner:subject:policy",
    });
    expect(built.idempotency_key).toBeNull();

    const metadata = normalizePartnerFlowAuditMetadata({
      flowTraceId: "ft_test",
      partnerId: "partner",
      policyId: "policy",
      outcome: "enter",
      reasonCodes: ["approved", "leak@example.com"],
    });
    expect(metadata.reason_codes).toEqual(["approved"]);
  });
});
