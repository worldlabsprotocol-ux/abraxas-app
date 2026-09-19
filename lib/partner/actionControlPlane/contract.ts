// FILE: lib/partner/actionControlPlane/contract.ts
// Partner Action Control Plane. Launchpad operator view over existing receipt-gated integrations.

import { PARTNER_EVENT_NOT_AUTHORIZATION } from "@/lib/partner/eventDelivery/contract";
import { PAYMENT_AUTHORIZATION_NO_FUNDS_BOUNDARY } from "@/lib/partner/paymentAuthorization/contract";
import { TRADING_VENUE_NO_FUNDS_BOUNDARY } from "@/lib/partner/tradingVenue/contract";
import { WALLET_STANDARD_NOT_IDENTITY } from "@/lib/partner/walletStandard/contract";
import { GOOGLE_ACCOUNT_NOT_ELIGIBILITY } from "@/lib/partner/launchpad/policyPacks";

export const ACTION_CONTROL_PLANE_VERSION = "1.0.0" as const;
export const ACTION_CONTROL_PLANE_PATH = "/developers/launchpad" as const;
export const ACTION_CONTROL_PLANE_DOCS_PATH = "/docs/action-control-plane" as const;
export const ACTION_CONTROL_PLANE_API_PATH =
  "/api/launchpad/applications/[id]/action-control-plane" as const;

export const ACTION_CONTROL_PLANE_NOT_PARALLEL =
  "The Partner Action Control Plane lives inside Partner Launchpad. It does not create a second dashboard, identity system, receipt issuer, or demo product.";

export const ACTION_AUTHORIZATION_CORE_RULES = [
  "partner_id",
  "policy_id",
  "policy_version",
  "action_scope",
  "expires_at",
  "one_time_nonce",
  "current_receipt",
] as const;

export const ACTION_CONTROL_PLANE_CAPABILITIES = [
  "hosted_partner_flow",
  "receipt_verify",
  "webhooks",
  "trading_venue",
  "payment_authorization",
  "wallet_standard_binding",
] as const;

export type ActionControlPlaneCapabilityId =
  (typeof ACTION_CONTROL_PLANE_CAPABILITIES)[number];

export const ACTION_CONTROL_PLANE_CHECKLIST = [
  "policy_selected",
  "hosted_callback_allowlisted",
  "partner_flow_tested",
  "receipt_verification_connected",
  "webhook_endpoint_verified",
  "trading_preflight_tested",
  "payment_preflight_tested",
  "wallet_binding_tested",
  "production_upgrade_readiness",
] as const;

export type ActionControlPlaneChecklistId =
  (typeof ACTION_CONTROL_PLANE_CHECKLIST)[number];

export const ACTION_CONTROL_PLANE_LIFECYCLE_LANES = [
  "action_preflight",
  "receipt_validity",
  "nonce_replay",
  "webhook_delivery",
  "policy_version",
] as const;

export type ActionControlPlaneLifecycleLane =
  (typeof ACTION_CONTROL_PLANE_LIFECYCLE_LANES)[number];

export const ACTION_CONTROL_PLANE_SAFE_REASONS = [
  "permitted",
  "policy_denied",
  "receipt_expired",
  "receipt_revoked",
  "nonce_replayed",
  "webhook_retrying",
  "webhook_failed",
  "policy_version_blocked",
  "not_run",
  "action_required",
  "optional_not_required",
  "review_required",
  "review_pending",
  "reviewed_active",
  "invalid",
] as const;

export type ActionControlPlaneSafeReason =
  (typeof ACTION_CONTROL_PLANE_SAFE_REASONS)[number];

export const ACTION_CONTROL_PLANE_READINESS = [
  "ready",
  "action_required",
  "blocked",
  "not_run",
  "optional",
] as const;

export type ActionControlPlaneReadiness =
  (typeof ACTION_CONTROL_PLANE_READINESS)[number];

export const ACTION_CONTROL_PLANE_PRODUCTION = {
  self_issued: false as const,
  reviewed: true as const,
  deny_code: "production_upgrade_requires_review" as const,
  notice:
    "Production credentials stay on the reviewed Launchpad upgrade path. The control plane cannot issue live keys, activate Production, or treat a sandbox pass as authorization.",
};

export const ACTION_CONTROL_PLANE_FORBIDDEN_KEYS = [
  "api_key",
  "abx_test_",
  "abx_live_",
  "abx_whsec_",
  "secret",
  "signature",
  "receipt",
  "receipt_id",
  "wallet",
  "wallet_address",
  "email",
  "legal_name",
  "date_of_birth",
  "dob",
  "passport",
  "selfie",
  "document_number",
  "id_token",
  "jwt",
  "private_key",
  "signing_key",
  "oauth",
  "provider_payload",
] as const;

export const ACTION_CONTROL_PLANE_GOOGLE = GOOGLE_ACCOUNT_NOT_ELIGIBILITY;
export const ACTION_CONTROL_PLANE_WEBHOOK_NOTICE = PARTNER_EVENT_NOT_AUTHORIZATION;
export const ACTION_CONTROL_PLANE_VENUE_NOTICE = TRADING_VENUE_NO_FUNDS_BOUNDARY;
export const ACTION_CONTROL_PLANE_PAYMENT_NOTICE = PAYMENT_AUTHORIZATION_NO_FUNDS_BOUNDARY;
export const ACTION_CONTROL_PLANE_WALLET_NOTICE = WALLET_STANDARD_NOT_IDENTITY;

export const ACTION_CONTROL_PLANE_CAPABILITY_META: Record<
  ActionControlPlaneCapabilityId,
  { label: string; href: string; next_when_missing: string }
> = {
  hosted_partner_flow: {
    label: "Hosted Partner Flow",
    href: "/docs/partner-flow",
    next_when_missing: "Select a policy pack and allowlist a hosted callback, then run Partner Flow from Launchpad.",
  },
  receipt_verify: {
    label: "Receipt verification",
    href: "/docs/integration-kit",
    next_when_missing: "Connect server-side GET /api/receipts/{id}/public through AbraxasPartnerKit and run the receipt harness.",
  },
  webhooks: {
    label: "Webhooks",
    href: "/docs/partner-event-delivery",
    next_when_missing: "Register an HTTPS webhook, store the signing secret on your server, and send a labeled test event.",
  },
  trading_venue: {
    label: "Trading venue access",
    href: "/docs/trading-venue",
    next_when_missing: "Issue a venue action contract and run a sandbox enable_market_access preflight on your server.",
  },
  payment_authorization: {
    label: "Payment authorization",
    href: "/docs/payment-authorization",
    next_when_missing: "Issue a payment action contract and run a sandbox authorize_checkout or authorize_recurring_payment preflight.",
  },
  wallet_standard_binding: {
    label: "Optional Wallet Standard binding",
    href: "/docs/wallet-standard-binding",
    next_when_missing: "Leave binding detached, or run an optional Wallet Standard challenge and attach an opaque binding_ref.",
  },
};

export function isActionControlPlaneCapabilityId(
  value: string,
): value is ActionControlPlaneCapabilityId {
  return (ACTION_CONTROL_PLANE_CAPABILITIES as readonly string[]).includes(value);
}

export function isActionControlPlaneSafeReason(
  value: string,
): value is ActionControlPlaneSafeReason {
  return (ACTION_CONTROL_PLANE_SAFE_REASONS as readonly string[]).includes(value);
}
