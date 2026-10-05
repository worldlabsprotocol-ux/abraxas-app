// FILE: lib/partner/partnerFlowContinuationIdentifiers.ts
// Route verification-request identifier families to the correct durable columns.

import { isOpaqueVerifyRequest } from "@/lib/partner/productionIntegration/requestCorrelation";

const UUID_VERIFY_REQUEST_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isVerificationRequestUuid(value: string): boolean {
  return UUID_VERIFY_REQUEST_PATTERN.test(value.trim());
}

export type ContinuationVerifyRequestColumns = {
  verify_request_id: string | null;
  opaque_verify_request: string | null;
};

/** Map a logical verify request id to its durable column assignment. */
export function continuationVerifyRequestColumns(
  verifyRequestId: string | null | undefined,
): ContinuationVerifyRequestColumns {
  const trimmed = verifyRequestId?.trim() ?? "";
  if (!trimmed) {
    return { verify_request_id: null, opaque_verify_request: null };
  }
  if (isOpaqueVerifyRequest(trimmed)) {
    return { verify_request_id: null, opaque_verify_request: trimmed };
  }
  return { verify_request_id: trimmed, opaque_verify_request: null };
}

export function continuationVerifyRequestLookupColumn(
  verifyRequestId: string,
): "opaque_verify_request" | "verify_request_id" {
  const trimmed = verifyRequestId.trim();
  if (!trimmed) return "verify_request_id";
  return isOpaqueVerifyRequest(trimmed) ? "opaque_verify_request" : "verify_request_id";
}

export function normalizeContinuationVerifyRequestId(
  verifyRequestId: string,
): string | null {
  const trimmed = verifyRequestId.trim();
  return trimmed || null;
}

export function readContinuationVerifyRequestId(row: Record<string, unknown>): string | null {
  const opaque = typeof row.opaque_verify_request === "string" ? row.opaque_verify_request.trim() : "";
  if (opaque) return opaque;
  const uuid = row.verify_request_id ? String(row.verify_request_id).trim() : "";
  return uuid || null;
}

export function assertAttachableVerificationRequestId(verifyRequestId: string): void {
  if (isOpaqueVerifyRequest(verifyRequestId)) {
    throw Object.assign(new Error("opaque_verify_request_not_attachable"), {
      code: "invalid_verify_request_id",
    });
  }
}

export function isVerificationRequestUuidShape(value: string): boolean {
  return isVerificationRequestUuid(value);
}
