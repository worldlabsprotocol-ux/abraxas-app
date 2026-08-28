// FILE: lib/admin/designPartnerLifecycleAuditProductionFixture.ts
// Exact Production v2 RPC envelope shape for lifecycle audit read-path regression tests.

export const PRODUCTION_LIFECYCLE_AUDIT_APPLICATION_ID =
  "a1b2c3d4-e5f6-4789-a012-3456789abcde";

export const PRODUCTION_LIFECYCLE_AUDIT_APPROVED_RPC_EVENT = {
  event_type: "admin.design_partner.approved",
  application_id: PRODUCTION_LIFECYCLE_AUDIT_APPLICATION_ID,
  from_status: "submitted",
  to_status: "approved",
  promoted_partner_id: null,
  occurred_at: "2026-08-28T14:30:45.123Z",
  operator_category: "admin_authorized_email",
} as const;

export const PRODUCTION_LIFECYCLE_AUDIT_APPROVED_RPC_ENVELOPE = {
  events: [PRODUCTION_LIFECYCLE_AUDIT_APPROVED_RPC_EVENT],
  next_cursor: null,
} as const;

export const PRODUCTION_LIFECYCLE_AUDIT_APPROVED_DTO_EVENT = {
  event_type: "admin.design_partner.approved",
  from_status: "submitted",
  to_status: "approved",
  promoted_partner_id: null,
  occurred_at: "2026-08-28T14:30:45.123Z",
  operator_label: "Authorized operator",
} as const;

export const PRODUCTION_LIFECYCLE_AUDIT_APPROVED_API_RESPONSE = {
  application_id: PRODUCTION_LIFECYCLE_AUDIT_APPLICATION_ID,
  events: [PRODUCTION_LIFECYCLE_AUDIT_APPROVED_DTO_EVENT],
  next_cursor: null,
} as const;
