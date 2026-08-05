import { describe, expect, it } from "vitest";
import {
  assertIdempotentPartnerFlowIdentity,
  buildPartnerFlowSessionIdempotencyKey,
  buildPartnerFlowVerificationRequestIdempotencyKey,
  PartnerFlowIdempotencyConflictError,
  resolvePartnerFlowIdempotencyKey,
} from "@/lib/partner/partnerFlowIdempotency";

const PARTNER = "good-trouble-cannabis";
const POLICY = "good-trouble-retail-v1";
const SUBJECT = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
const VR = "00000000-0000-4000-8000-0000000000aa";

describe("partnerFlowIdempotency keys", () => {
  it("uses session scope for evaluate/refresh", () => {
    expect(
      buildPartnerFlowSessionIdempotencyKey({
        partnerId: PARTNER,
        subjectId: SUBJECT,
        policyId: POLICY,
      }),
    ).toBe(`pf_session:${PARTNER}:${SUBJECT}:${POLICY}`);
  });

  it("uses verification request scope for complete", () => {
    expect(buildPartnerFlowVerificationRequestIdempotencyKey(VR)).toBe(`pf_vr:${VR}`);
    expect(
      resolvePartnerFlowIdempotencyKey({
        partnerId: PARTNER,
        subjectId: SUBJECT,
        policyId: POLICY,
        verificationRequestId: VR,
      }),
    ).toBe(`pf_vr:${VR}`);
  });

  it("rejects conflicting stored identity", () => {
    expect(() =>
      assertIdempotentPartnerFlowIdentity(
        {
          decision_id: "vd-1",
          partner_id: PARTNER,
          subject_id: SUBJECT,
          policy_id: POLICY,
          request_id: VR,
          idempotency_key: `pf_vr:${VR}`,
          valid_until: "2099-01-01T00:00:00.000Z",
        },
        {
          partnerId: "other-partner",
          subjectId: SUBJECT,
          policyId: POLICY,
          verificationRequestId: VR,
        },
      ),
    ).toThrow(PartnerFlowIdempotencyConflictError);
  });

  it("allows matching idempotent replay identity", () => {
    expect(() =>
      assertIdempotentPartnerFlowIdentity(
        {
          decision_id: "vd-1",
          partner_id: PARTNER,
          subject_id: SUBJECT,
          policy_id: POLICY,
          request_id: VR,
          idempotency_key: `pf_vr:${VR}`,
          valid_until: "2099-01-01T00:00:00.000Z",
        },
        {
          partnerId: PARTNER,
          subjectId: SUBJECT,
          policyId: POLICY,
          verificationRequestId: VR,
        },
      ),
    ).not.toThrow();
  });
});
