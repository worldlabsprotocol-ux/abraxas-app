// FILE: lib/partner/launchpad/goLiveReadiness/contract.ts
// Go-live readiness and reviewed Production-access request. Lives inside Launchpad.

export const GO_LIVE_REVIEW_PATH = "/developers/launchpad" as const;
export const GO_LIVE_REVIEW_ENTRY = "Request Production review" as const;
export const GO_LIVE_NOTE_MAX_CHARS = 280 as const;

export const GO_LIVE_LIFECYCLE = [
  "ready_to_request_review",
  "needs_setup",
  "under_review",
  "approved_for_production",
] as const;
export type GoLiveLifecycle = (typeof GO_LIVE_LIFECYCLE)[number];

export const GO_LIVE_LIFECYCLE_LABEL: Record<GoLiveLifecycle, string> = {
  ready_to_request_review: "Ready to request review",
  needs_setup: "Needs setup",
  under_review: "Under review",
  approved_for_production: "Approved for Production",
};

export const GO_LIVE_CAPABILITIES = [
  "hosted_partner_flow",
  "receipt_verify",
  "webhooks",
  "trading_venue",
  "payment_authorization",
  "wallet_standard_binding",
  "solana_gate",
] as const;
export type GoLiveCapability = (typeof GO_LIVE_CAPABILITIES)[number];

export const GO_LIVE_ITEM_IDS = [
  "sandbox_app",
  "policy_pin",
  "callback",
  "sandbox_key",
  "starter_kit",
  "test_console",
  "webhooks",
  "trading_venue",
  "payment_authorization",
  "wallet_standard_binding",
  "solana_gate",
] as const;
export type GoLiveItemId = (typeof GO_LIVE_ITEM_IDS)[number];

export const GO_LIVE_ITEM_HREF: Record<GoLiveItemId, string> = {
  sandbox_app: "/developers/launchpad",
  policy_pin: "/developers/launchpad?view=versions",
  callback: "/developers/launchpad?view=destinations",
  sandbox_key: "/developers/launchpad?view=provisioned",
  starter_kit: "/developers/integration-studio",
  test_console: "/developers/launchpad?view=test",
  webhooks: "/docs/partner-flow",
  trading_venue: "/docs/action-control-plane",
  payment_authorization: "/docs/action-control-plane",
  wallet_standard_binding: "/docs/action-control-plane",
  solana_gate: "/docs/starter-kit",
};

export const GO_LIVE_PRODUCTION = {
  self_issued: false as const,
  reviewed: true as const,
  issues_production_key: false as const,
  activates_production: false as const,
  deny_code: "production_review_required" as const,
  notice:
    "Submitting a request asks a reviewer to consider Production access. It does not issue a production key, activate Production, change policy, or create a payment, trade, wallet, receipt, settlement, or transfer.",
} as const;

export const GO_LIVE_CLIENT_OVERRIDE_KEYS = [
  "partner_id",
  "readiness_status",
  "lifecycle",
  "status",
  "approval",
  "approved",
  "activate_production",
  "environment",
  "production_api_key",
  "production_key",
  "api_key",
  "key_prefix",
  "issues_production_key",
] as const;

export const GO_LIVE_PUBLIC_ERRORS = {
  not_ready: "go_live_not_ready",
  note_invalid: "go_live_note_invalid",
  client_override: "go_live_client_override_rejected",
  request_failed: "go_live_request_failed",
} as const;

export function launchpadGoLiveHref(applicationId?: string | null): string {
  if (!applicationId) return `${GO_LIVE_REVIEW_PATH}?view=production`;
  return `${GO_LIVE_REVIEW_PATH}?app=${encodeURIComponent(applicationId)}&view=production`;
}
