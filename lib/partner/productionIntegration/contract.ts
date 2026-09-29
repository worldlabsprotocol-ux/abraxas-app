// FILE: lib/partner/productionIntegration/contract.ts
// Canonical production relying-party integration contract. One surface, no competing patterns.

export const PRODUCTION_INTEGRATION_CONTRACT_VERSION = "1.0.0" as const;

export const PRODUCTION_INTEGRATION_START_VERIFICATION = {
  summary: "Partner backend constructs Hosted Partner Flow with server-known identity, policy, purpose, and an allowlisted callback.",
  required: [
    "partner_id or Launchpad app slug",
    "policy_id pinned to an approved version",
    "return_url exactly matching partners.allowed_return_urls / Launchpad allowlist",
    "server-issued request_id per concurrent action (embed in return_url query or use hosted handoff verify_request)",
  ],
  optional: ["purpose", "app slug for Launchpad-resolved config"],
  must_not: [
    "Accept return_url from the holder browser at runtime",
    "Put partner API keys in the redirect URL or client bundle",
    "Treat callback decision/status query params as authorization",
  ],
} as const;

export const PRODUCTION_INTEGRATION_CALLBACK = {
  summary: "Callback carries routing and correlation only. Authorization comes from verified public receipt.",
  safe_fields: ["receipt_id", "request_id", "decision_id", "status", "decision", "policy_id", "partner_id", "receipt_expires_at", "credential_id"],
  forbidden_as_authorization: ["approved", "decision", "status", "partner_id", "policy_id"],
  note: "Partners must re-fetch GET /api/receipts/{id}/public and run AbraxasPartnerKit.verifyForAction before any grant.",
} as const;

export const PRODUCTION_INTEGRATION_SERVER_VERIFICATION_STEPS = [
  "Receive receipt_id (and optional request_id) from callback",
  "Fetch public receipt via AbraxasPartnerKit.fetchPublicReceipt",
  "Verify cryptographic validity (signature_valid, schema_version)",
  "Check current status (active, not expired, not revoked)",
  "Check expiry (expires_at in the future)",
  "Check partner_id matches expected partner",
  "Check policy_id and policy_version match pinned expectation",
  "Check environment (production_usable / decision_context for production mode)",
  "Check request correlation when the action started with a server-issued request_id",
  "Check purpose/action binding when using hosted handoff verify_request",
  "Produce local permit/deny; never trust callback query params alone",
] as const;

export const PRODUCTION_INTEGRATION_BLOCKERS = [
  "production_access_not_approved",
  "production_credential_inactive",
  "production_credential_revoked",
  "production_callback_missing",
  "production_callback_not_https",
  "production_callback_domain_unverified",
  "sandbox_only_policy",
  "policy_not_pinned",
  "partner_flow_not_configured",
  "sandbox_credential_on_production_resource",
  "sandbox_receipt_in_production_verification",
  "webhook_required_but_unconfigured",
  "optional_capability_not_evidenced",
] as const;

export type ProductionIntegrationBlocker = (typeof PRODUCTION_INTEGRATION_BLOCKERS)[number];

export const PRODUCTION_INTEGRATION_OPTIONAL_LAYERS = [
  "wallet_standard_binding",
  "zkLogin",
  "stablecoin",
  "payments",
  "paid_plan",
  "partner_activity_signal",
] as const;

export const PRODUCTION_INTEGRATION_CORE_PATH_NOTE =
  "The core age_21_retail relying-party path requires none of wallet, zkLogin, stablecoin, payment, paid plan, or partner activity signal.";
