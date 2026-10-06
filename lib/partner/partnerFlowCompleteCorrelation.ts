// FILE: lib/partner/partnerFlowCompleteCorrelation.ts
// Separate opaque hosted verify_request tokens from verification_requests.id UUIDs.

import {
  isOpaqueVerifyRequest,
  isVerificationRequestUuid,
} from "@/lib/partner/partnerFlowContinuationIdentifiers";

export class PartnerFlowCompleteRequestError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PartnerFlowCompleteRequestError";
    this.code = code;
  }
}

export type ResolvedPartnerFlowCompleteCorrelation = {
  /** Opaque vr_* or canonical verification_requests.id UUID for idempotency + trace. */
  correlationId: string | null;
  /** Canonical UUID only — never opaque vr_*. */
  verificationRequestUuid: string | null;
  /** Opaque hosted-handoff token when present. */
  opaqueVerifyRequest: string | null;
};

export function resolvePartnerFlowCompleteCorrelation(input: {
  verification_request_id?: string | null;
  verify_request?: string | null;
}): ResolvedPartnerFlowCompleteCorrelation {
  const verificationRequestId = input.verification_request_id?.trim() ?? "";
  const verifyRequest = input.verify_request?.trim() ?? "";

  if (verificationRequestId && isOpaqueVerifyRequest(verificationRequestId)) {
    throw new PartnerFlowCompleteRequestError(
      "invalid_verification_request_id",
      "verification_request_id must be a canonical UUID; use verify_request for opaque hosted tokens",
    );
  }

  if (verificationRequestId && !isVerificationRequestUuid(verificationRequestId)) {
    throw new PartnerFlowCompleteRequestError(
      "invalid_verification_request_id",
      "verification_request_id must be a canonical UUID",
    );
  }

  if (verifyRequest && !isOpaqueVerifyRequest(verifyRequest)) {
    throw new PartnerFlowCompleteRequestError(
      "invalid_verify_request",
      "verify_request must be an opaque hosted-handoff token",
    );
  }

  const verificationRequestUuid = verificationRequestId || null;
  const opaqueVerifyRequest = verifyRequest || null;
  const correlationId = opaqueVerifyRequest ?? verificationRequestUuid;

  return {
    correlationId,
    verificationRequestUuid,
    opaqueVerifyRequest,
  };
}

/** Server-side defense when legacy callers still pass vr_* in verification_request_id. */
export function resolvePartnerFlowReceiptCorrelation(
  verificationRequestCorrelation?: string | null,
): ResolvedPartnerFlowCompleteCorrelation {
  const trimmed = verificationRequestCorrelation?.trim() ?? "";
  if (!trimmed) {
    return { correlationId: null, verificationRequestUuid: null, opaqueVerifyRequest: null };
  }
  if (isOpaqueVerifyRequest(trimmed)) {
    return {
      correlationId: trimmed,
      verificationRequestUuid: null,
      opaqueVerifyRequest: trimmed,
    };
  }
  if (!isVerificationRequestUuid(trimmed)) {
    return { correlationId: null, verificationRequestUuid: null, opaqueVerifyRequest: null };
  }
  return {
    correlationId: trimmed,
    verificationRequestUuid: trimmed,
    opaqueVerifyRequest: null,
  };
}

export function coerceLegacyOpaqueVerificationRequestId(
  verificationRequestId: string | null | undefined,
): ResolvedPartnerFlowCompleteCorrelation {
  const trimmed = verificationRequestId?.trim() ?? "";
  if (!trimmed) {
    return { correlationId: null, verificationRequestUuid: null, opaqueVerifyRequest: null };
  }
  if (isOpaqueVerifyRequest(trimmed)) {
    return {
      correlationId: trimmed,
      verificationRequestUuid: null,
      opaqueVerifyRequest: trimmed,
    };
  }
  if (!isVerificationRequestUuid(trimmed)) {
    throw new PartnerFlowCompleteRequestError(
      "invalid_verification_request_id",
      "verification_request_id must be a canonical UUID",
    );
  }
  return {
    correlationId: trimmed,
    verificationRequestUuid: trimmed,
    opaqueVerifyRequest: null,
  };
}
