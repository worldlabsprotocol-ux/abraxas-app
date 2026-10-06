import { describe, expect, it } from "vitest";
import {
  PartnerFlowCompleteRequestError,
  coerceLegacyOpaqueVerificationRequestId,
  resolvePartnerFlowCompleteCorrelation,
  resolvePartnerFlowReceiptCorrelation,
} from "./partnerFlowCompleteCorrelation";

const CANONICAL_UUID = "00000000-0000-4000-8000-0000000000aa";
const OPAQUE = "vr_testopaque00000001";

describe("resolvePartnerFlowCompleteCorrelation", () => {
  it("accepts opaque verify_request without verification_request_id", () => {
    expect(resolvePartnerFlowCompleteCorrelation({ verify_request: OPAQUE })).toEqual({
      correlationId: OPAQUE,
      verificationRequestUuid: null,
      opaqueVerifyRequest: OPAQUE,
    });
  });

  it("accepts canonical verification_request_id UUID", () => {
    expect(resolvePartnerFlowCompleteCorrelation({ verification_request_id: CANONICAL_UUID })).toEqual({
      correlationId: CANONICAL_UUID,
      verificationRequestUuid: CANONICAL_UUID,
      opaqueVerifyRequest: null,
    });
  });

  it("rejects opaque token in verification_request_id", () => {
    expect(() => resolvePartnerFlowCompleteCorrelation({
      verification_request_id: OPAQUE,
    })).toThrow(PartnerFlowCompleteRequestError);
    try {
      resolvePartnerFlowCompleteCorrelation({ verification_request_id: OPAQUE });
    } catch (e) {
      expect(e).toMatchObject({
        code: "invalid_verification_request_id",
        message: expect.stringContaining("verify_request"),
      });
    }
  });

  it("rejects non-UUID verification_request_id", () => {
    expect(() => resolvePartnerFlowCompleteCorrelation({
      verification_request_id: "not-a-uuid",
    })).toThrow(PartnerFlowCompleteRequestError);
  });

  it("rejects non-opaque verify_request", () => {
    expect(() => resolvePartnerFlowCompleteCorrelation({
      verify_request: CANONICAL_UUID,
    })).toThrow(PartnerFlowCompleteRequestError);
  });
});

describe("resolvePartnerFlowReceiptCorrelation", () => {
  it("maps opaque vr_* to correlation without UUID", () => {
    expect(resolvePartnerFlowReceiptCorrelation(OPAQUE)).toEqual({
      correlationId: OPAQUE,
      verificationRequestUuid: null,
      opaqueVerifyRequest: OPAQUE,
    });
  });

  it("maps canonical UUID to both correlation and UUID", () => {
    expect(resolvePartnerFlowReceiptCorrelation(CANONICAL_UUID)).toEqual({
      correlationId: CANONICAL_UUID,
      verificationRequestUuid: CANONICAL_UUID,
      opaqueVerifyRequest: null,
    });
  });

  it("returns null correlation for invalid non-opaque non-UUID input", () => {
    expect(resolvePartnerFlowReceiptCorrelation("garbage")).toEqual({
      correlationId: null,
      verificationRequestUuid: null,
      opaqueVerifyRequest: null,
    });
  });
});

describe("coerceLegacyOpaqueVerificationRequestId", () => {
  it("coerces legacy opaque verification_request_id for server defense", () => {
    expect(coerceLegacyOpaqueVerificationRequestId(OPAQUE)).toEqual({
      correlationId: OPAQUE,
      verificationRequestUuid: null,
      opaqueVerifyRequest: OPAQUE,
    });
  });

  it("throws for invalid non-opaque non-UUID legacy input", () => {
    expect(() => coerceLegacyOpaqueVerificationRequestId("garbage")).toThrow(
      PartnerFlowCompleteRequestError,
    );
  });
});
