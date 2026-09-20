// FILE: lib/partner/launchpad/productionReview/contract.ts
// Operator Production-review control plane. Not key issuance, Mainnet activation, or execution.

export const PRODUCTION_REVIEW_PATH = "/admin/production-review" as const;
export const PRODUCTION_REVIEW_DOCS = "/docs/production-review" as const;
export const PRODUCTION_REVIEW_VERSION = "1.0.0" as const;

export const PRODUCTION_REVIEW_NOTICE =
  "Operator review approval means only that this Launchpad app is approved for the reviewed Production integration path. It does not issue a production API key, activate Mainnet, create a wallet, submit a transaction, trade, payment, or transfer, issue a receipt, or change policy pins, callbacks, or capabilities.";

export const PRODUCTION_REVIEW_DECISIONS = ["approve", "reject"] as const;
export type ProductionReviewDecision = (typeof PRODUCTION_REVIEW_DECISIONS)[number];

export const PRODUCTION_REVIEW_CLIENT_OVERRIDE_KEYS = [
  "partner_id",
  "application_id",
  "readiness",
  "readiness_status",
  "lifecycle",
  "approval",
  "approved",
  "activate_production",
  "activate_mainnet",
  "environment",
  "production",
  "policy_id",
  "policy_version",
  "network",
  "network_id",
  "capability",
  "capabilities",
  "api_key",
  "production_api_key",
  "key_prefix",
  "receipt",
  "receipt_id",
  "callback",
  "callback_url",
  "wallet",
  "wallet_address",
  "transaction",
  "tx",
  "role",
  "admin",
  "operator",
] as const;

export const PRODUCTION_REVIEW_ALLOWED_BODY_KEYS = ["decision", "confirm", "remediation_class"] as const;

export const PRODUCTION_REVIEW_BLOCKERS = [
  "request_not_pending",
  "app_mismatch",
  "app_not_active",
  "readiness_incomplete",
  "sandbox_only_policy",
  "policy_version_mismatch",
  "network_disabled",
  "network_planned",
  "network_unconfigured",
  "durable_schema_missing",
  "revocation_unresolved",
  "store_unavailable",
  "csrf_required",
  "unauthorized",
  "forbidden",
  "invalid_input",
  "client_override_rejected",
  "rate_limited",
] as const;
export type ProductionReviewBlocker = (typeof PRODUCTION_REVIEW_BLOCKERS)[number];

export const PRODUCTION_REVIEW_PARTNER_REMEDIATION = [
  "complete_sandbox_readiness",
  "choose_production_eligible_policy",
  "fix_policy_version",
  "remove_unavailable_network",
  "resolve_revocation",
  "resubmit_after_rejection",
  "wait_for_reviewer",
] as const;
export type ProductionReviewRemediation = (typeof PRODUCTION_REVIEW_PARTNER_REMEDIATION)[number];

export const PRODUCTION_REVIEW_PUBLIC_ERRORS = {
  unauthorized: "unauthorized",
  forbidden: "forbidden",
  invalid_input: "invalid_input",
  client_override: "production_review_client_override_rejected",
  not_pending: "production_review_not_pending",
  not_ready: "production_review_not_ready",
  store: "production_review_store_unavailable",
  csrf: "production_review_csrf_required",
  rate_limited: "production_review_rate_limited",
} as const;

export function partnerRemediationForBlocker(blocker: ProductionReviewBlocker): ProductionReviewRemediation {
  switch (blocker) {
    case "sandbox_only_policy":
      return "choose_production_eligible_policy";
    case "policy_version_mismatch":
      return "fix_policy_version";
    case "network_disabled":
    case "network_planned":
    case "network_unconfigured":
      return "remove_unavailable_network";
    case "revocation_unresolved":
      return "resolve_revocation";
    case "request_not_pending":
      return "resubmit_after_rejection";
    case "readiness_incomplete":
      return "complete_sandbox_readiness";
    default:
      return "wait_for_reviewer";
  }
}
