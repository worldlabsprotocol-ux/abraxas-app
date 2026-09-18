// FILE: lib/partner/launchpad/sandboxReadiness/codes.ts
// Precise safe codes for Partner Sandbox / Integration Readiness. Never treat sandbox pass as production authorization.

export const SANDBOX_READINESS_LABEL = "sandbox/test" as const;
export const SANDBOX_READINESS_ARTIFACT = "abraxas_partner_sandbox_manifest" as const;
export const SANDBOX_READINESS_SCHEMA_VERSION = "1.0.0" as const;
export const SANDBOX_PASS_IS_NOT_PRODUCTION_AUTHORIZATION =
  "sandbox_pass_is_not_production_authorization" as const;

export type SandboxReadinessStatus = "pass" | "fail" | "blocked" | "not_run";

export const SANDBOX_READINESS_STAGES = [
  "policy_configured",
  "callback_allowlisted",
  "server_receipt_verification",
  "fail_closed",
  "webhook_test",
  "policy_version_compatibility",
] as const;

export type SandboxReadinessStageId = (typeof SANDBOX_READINESS_STAGES)[number];

export const SANDBOX_READINESS_CODES = [
  "policy_pin_missing",
  "policy_configured",
  "callback_missing",
  "callback_not_allowlisted",
  "callback_localhost_sandbox_only",
  "callback_allowlisted",
  "receipt_verification_not_run",
  "receipt_verified_sandbox",
  "receipt_unsigned",
  "receipt_wrong_partner",
  "receipt_wrong_policy",
  "receipt_wrong_policy_version",
  "receipt_denied",
  "receipt_expired",
  "receipt_revoked",
  "fail_closed_not_run",
  "fail_closed_passed",
  "webhook_not_configured",
  "webhook_disabled",
  "webhook_hmac_unverified",
  "webhook_hmac_verified",
  "webhook_delivery_failed",
  "webhook_test_queued",
  "webhook_test_not_run",
  "event_type_not_supported",
  "policy_schema_unavailable",
  "policy_version_not_adopted",
  "policy_version_compatible",
  "sandbox_run_duplicate",
  "sandbox_rate_limited",
  "sandbox_key_missing",
  "key_scope_ready",
  "dns_not_verified",
  "dns_verified",
  SANDBOX_PASS_IS_NOT_PRODUCTION_AUTHORIZATION,
] as const;

export type SandboxReadinessCode = (typeof SANDBOX_READINESS_CODES)[number];

export const SANDBOX_READINESS_STAGE_LABELS: Record<SandboxReadinessStageId, string> = {
  policy_configured: "Policy configured",
  callback_allowlisted: "Callback allowlisted",
  server_receipt_verification: "Server-side receipt verification",
  fail_closed: "Denied / expired / wrong-partner / wrong-policy fail closed",
  webhook_test: "Webhook TEST EVENT and HMAC verification",
  policy_version_compatibility: "Policy-version compatibility and explicit adoption",
};

export const FAIL_CLOSED_HARNESS_SCENARIOS = [
  "denied",
  "expired",
  "revoked",
  "wrong_partner",
  "wrong_policy",
] as const;

export const WEBHOOK_TEST_ALLOWED_EVENT_TYPES = [
  "partner.webhook.test",
  "TEST EVENT",
] as const;

export const SANDBOX_SUPPORTED_RECEIPT_OUTCOMES = [
  "approved",
  "denied",
  "expired",
  "revoked",
] as const;

export const SANDBOX_MANIFEST_FORBIDDEN_KEY_NEEDLES = [
  "secret",
  "jwt",
  "oauth",
  "id_token",
  "refresh_token",
  "private_key",
  "signing_key",
  "wallet",
  "date_of_birth",
  "email",
  "legal_name",
  "passport",
  "selfie",
  "document_number",
  "api_key",
  "abx_test_",
  "abx_live_",
  "abx_whsec_",
  "raw_audit",
] as const;
