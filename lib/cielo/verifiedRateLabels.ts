// FILE: lib/cielo/verifiedRateLabels.ts
// User-facing labels — verified-rate request, not booking/reservation.

export const VERIFIED_RATE_STATUSES = [
  "request_received",
  "pending_review",
  "eligible",
  "operator_confirmed",
  "declined",
  "not_eligible",
] as const;

export type VerifiedRateOperatorStatus = (typeof VERIFIED_RATE_STATUSES)[number];

export const USER_STATUS_LABELS: Record<VerifiedRateOperatorStatus, string> = {
  request_received: "Request received",
  pending_review: "Under review",
  eligible: "Eligible — operator will contact you",
  operator_confirmed: "Operator confirmed contact",
  declined: "Declined",
  not_eligible: "Not eligible",
};

export const OPERATOR_STATUS_LABELS: Record<VerifiedRateOperatorStatus, string> = {
  request_received: "Request received",
  pending_review: "Pending review",
  eligible: "Eligible",
  operator_confirmed: "Operator confirmed contact sent",
  declined: "Declined",
  not_eligible: "Not eligible",
};

export const VERIFIED_RATE_DISCLAIMER =
  "This is a verified-rate request, not a confirmed reservation. No payment or booking confirmation is implied.";
