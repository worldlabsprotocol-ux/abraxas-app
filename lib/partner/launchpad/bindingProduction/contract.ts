// FILE: lib/partner/launchpad/bindingProduction/contract.ts

export const BINDING_PRODUCTION_STATUSES = [
  "sandbox_only",
  "production_requested",
  "production_under_review",
  "production_approved",
  "production_active",
  "production_rejected",
  "production_suspended",
] as const;

export type BindingProductionStatus = (typeof BINDING_PRODUCTION_STATUSES)[number];

export const BINDING_PRODUCTION_AUDIT_EVENTS = [
  "binding_production_requested",
  "binding_production_review_started",
  "binding_production_approved",
  "binding_production_rejected",
  "binding_production_activated",
  "binding_production_suspended",
  "binding_production_reactivated",
] as const;

export const BINDING_PRODUCTION_REQUEST_RPC = "partner_launchpad_request_binding_production_atomic" as const;
export const BINDING_PRODUCTION_DECIDE_RPC = "partner_launchpad_decide_binding_production_atomic" as const;

export interface BindingProductionRequestRow {
  id: string;
  binding_id: string;
  application_id: string;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  policy_template_id: string;
  status: "pending" | "approved" | "rejected";
  request_notes: string | null;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface BindingProductionPartnerView {
  binding_id: string;
  policy_id: string;
  policy_version: number;
  pack_id: string;
  production_status: BindingProductionStatus;
  production_authorized: boolean;
  application_production_active: boolean;
  can_request_production: boolean;
  pending_request_id: string | null;
  next_action: string | null;
}
