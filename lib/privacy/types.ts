// FILE: lib/privacy/types.ts
// Privacy request ledger types — non-PII reason codes and status flow.

export const PRIVACY_REQUEST_TYPES = ["data_export", "account_deletion"] as const;
export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];

export const PRIVACY_REQUEST_STATUSES = [
  "requested",
  "under_review",
  "approved",
  "denied",
  "completed",
  "legal_hold",
  "access_revoked_pending_purge",
] as const;
export type PrivacyRequestStatus = (typeof PRIVACY_REQUEST_STATUSES)[number];

export const PRIVACY_REASON_CODES = [
  "holder_requested",
  "duplicate_request",
  "identity_not_found",
  "legal_hold_active",
  "export_prepared",
  "export_not_available",
  "deletion_access_revoked",
  "deletion_purge_pending",
  "operator_denied",
  "insufficient_verification",
  "operator_review_started",
  "operator_completed",
] as const;
export type PrivacyReasonCode = (typeof PRIVACY_REASON_CODES)[number];

export const PRIVACY_CHANGED_BY_CATEGORIES = ["holder", "admin", "system"] as const;
export type PrivacyChangedByCategory = (typeof PRIVACY_CHANGED_BY_CATEGORIES)[number];

export interface PrivacyRequestRecord {
  id: string;
  subject_sui: string;
  subject_pseudonym_id: string;
  request_type: PrivacyRequestType;
  status: PrivacyRequestStatus;
  reason_code: PrivacyReasonCode | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrivacyRequestEventRecord {
  id: string;
  request_id: string;
  from_status: PrivacyRequestStatus | null;
  to_status: PrivacyRequestStatus;
  reason_code: PrivacyReasonCode;
  changed_by_category: PrivacyChangedByCategory;
  admin_actor_category: string | null;
  idempotency_key: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const PRIVACY_ACTIVE_STATUSES = [
  "requested",
  "under_review",
  "approved",
  "legal_hold",
  "access_revoked_pending_purge",
] as const;
export type PrivacyActiveStatus = (typeof PRIVACY_ACTIVE_STATUSES)[number];

export interface HolderPrivacyRequestView {
  request_ref: string;
  request_type: PrivacyRequestType;
  status: PrivacyRequestStatus;
  status_label: string;
  created_at: string;
  updated_at: string;
}

export interface AdminPrivacyRequestView extends HolderPrivacyRequestView {
  id: string;
  subject_pseudonym_id: string;
}

export const PRIVACY_STATUS_LABELS: Record<PrivacyRequestStatus, string> = {
  requested: "Request received",
  under_review: "Under review",
  approved: "Approved — fulfillment in progress",
  denied: "Request denied",
  completed: "Completed",
  legal_hold: "On legal hold — deletion not available yet",
  access_revoked_pending_purge: "Access revoked — physical deletion pending retention policy",
};

export function isPrivacyRequestType(value: string): value is PrivacyRequestType {
  return (PRIVACY_REQUEST_TYPES as readonly string[]).includes(value);
}

export function isPrivacyRequestStatus(value: string): value is PrivacyRequestStatus {
  return (PRIVACY_REQUEST_STATUSES as readonly string[]).includes(value);
}

export function isPrivacyReasonCode(value: string): value is PrivacyReasonCode {
  return (PRIVACY_REASON_CODES as readonly string[]).includes(value);
}

export function toHolderView(record: PrivacyRequestRecord): HolderPrivacyRequestView {
  return {
    request_ref: record.id.slice(0, 8),
    request_type: record.request_type,
    status: record.status,
    status_label: PRIVACY_STATUS_LABELS[record.status],
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

export function toAdminView(record: PrivacyRequestRecord): AdminPrivacyRequestView {
  return {
    ...toHolderView(record),
    id: record.id,
    subject_pseudonym_id: record.subject_pseudonym_id,
  };
}
