import { describe, expect, it } from "vitest";
import {
  assertAttachableVerificationRequestId,
  continuationVerifyRequestColumns,
  continuationVerifyRequestLookupColumn,
  readContinuationVerifyRequestId,
} from "./partnerFlowContinuationIdentifiers";

const OPAQUE = "vr_81cfe12715d8c338";
const UUID = "00000000-0000-4000-8000-0000000000aa";

describe("partnerFlowContinuationIdentifiers", () => {
  it("routes opaque hosted handoff tokens to opaque_verify_request only", () => {
    expect(continuationVerifyRequestColumns(OPAQUE)).toEqual({
      verify_request_id: null,
      opaque_verify_request: OPAQUE,
    });
    expect(continuationVerifyRequestLookupColumn(OPAQUE)).toBe("opaque_verify_request");
  });

  it("routes verification_requests UUID ids to verify_request_id only", () => {
    expect(continuationVerifyRequestColumns(UUID)).toEqual({
      verify_request_id: UUID,
      opaque_verify_request: null,
    });
    expect(continuationVerifyRequestLookupColumn(UUID)).toBe("verify_request_id");
  });

  it("prefers opaque_verify_request when reading rows", () => {
    expect(readContinuationVerifyRequestId({
      verify_request_id: UUID,
      opaque_verify_request: OPAQUE,
    })).toBe(OPAQUE);
    expect(readContinuationVerifyRequestId({ verify_request_id: UUID })).toBe(UUID);
  });

  it("rejects attaching opaque tokens to verify_request_id", () => {
    expect(() => assertAttachableVerificationRequestId(OPAQUE)).toThrow(/opaque_verify_request_not_attachable/);
  });
});
