// FILE: lib/partner/partnerFlowIdempotency.ts
// Partner Flow decision/receipt idempotency keys — server-derived, never client-authoritative.

export type PartnerFlowReplayStatus = "issued" | "idempotent_replay";

export class PartnerFlowIdempotencyConflictError extends Error {
  readonly code = "idempotency_conflict" as const;

  constructor(message = "Partner flow idempotency conflict — request identity does not match stored decision") {
    super(message);
    this.name = "PartnerFlowIdempotencyConflictError";
  }
}

/** Evaluate/refresh session receipt — holder + partner + policy. */
export function buildPartnerFlowSessionIdempotencyKey(input: {
  partnerId: string;
  subjectId: string;
  policyId: string;
}): string {
  return `pf_session:${input.partnerId}:${input.subjectId}:${input.policyId}`;
}

/** Complete after Passport — bound to verification request id. */
export function buildPartnerFlowVerificationRequestIdempotencyKey(
  verificationRequestId: string,
): string {
  return `pf_vr:${verificationRequestId}`;
}

export function resolvePartnerFlowIdempotencyKey(input: {
  partnerId: string;
  subjectId: string;
  policyId: string;
  verificationRequestId?: string | null;
}): string {
  const vrId = input.verificationRequestId?.trim();
  if (vrId) return buildPartnerFlowVerificationRequestIdempotencyKey(vrId);
  return buildPartnerFlowSessionIdempotencyKey({
    partnerId: input.partnerId,
    subjectId: input.subjectId,
    policyId: input.policyId,
  });
}

export interface StoredPartnerFlowDecisionIdentity {
  decision_id: string;
  partner_id: string;
  subject_id: string;
  policy_id: string;
  request_id: string | null;
  idempotency_key: string | null;
  valid_until: string | null;
}

export function assertIdempotentPartnerFlowIdentity(
  stored: StoredPartnerFlowDecisionIdentity,
  expected: { partnerId: string; subjectId: string; policyId: string; verificationRequestId?: string | null },
): void {
  if (
    stored.partner_id !== expected.partnerId
    || stored.subject_id !== expected.subjectId
    || stored.policy_id !== expected.policyId
  ) {
    throw new PartnerFlowIdempotencyConflictError(
      "idempotency_conflict:stored decision identity does not match request",
    );
  }

  const expectedVr = expected.verificationRequestId?.trim() ?? null;
  const storedVr = stored.request_id?.trim() ?? null;
  if (expectedVr && storedVr && expectedVr !== storedVr) {
    throw new PartnerFlowIdempotencyConflictError(
      "idempotency_conflict:verification_request_id mismatch",
    );
  }
}
