// FILE: lib/partner/integrationObservability/contract.ts
// Canonical privacy-safe relying-party integration lifecycle events.

export const INTEGRATION_OBSERVABILITY_VERSION = "1.0.0" as const;

export const INTEGRATION_LIFECYCLE_EVENT_TYPES = [
  "verification_request_created",
  "holder_flow_started",
  "holder_flow_completed",
  "policy_evaluated",
  "receipt_issued",
  "receipt_verification_succeeded",
  "receipt_verification_failed",
  "access_decision_permit",
  "access_decision_deny",
  "hosted_handoff_created",
  "hosted_handoff_create_failed",
  "hosted_handoff_completed",
  "production_activation_completed",
  "integration_smoke_completed",
  "receipt_revoked",
  "receipt_superseded",
  "evidence_reuse_accepted",
  "evidence_reuse_rejected",
  "evidence_refresh_required",
  "receipt_current_validity_failed",
] as const;
export type IntegrationLifecycleEventType = (typeof INTEGRATION_LIFECYCLE_EVENT_TYPES)[number];

export const INTEGRATION_LIFECYCLE_STAGES = [
  "request",
  "holder",
  "policy",
  "receipt",
  "verification",
  "decision",
  "activation",
  "smoke",
] as const;
export type IntegrationLifecycleStage = (typeof INTEGRATION_LIFECYCLE_STAGES)[number];

export const PARTNER_SAFE_FAILURE_CODES = [
  "receipt_missing",
  "receipt_invalid",
  "receipt_expired",
  "receipt_revoked",
  "partner_mismatch",
  "policy_mismatch",
  "policy_version_mismatch",
  "request_mismatch",
  "callback_invalid",
  "credential_invalid",
  "credential_revoked",
  "production_not_active",
  "verification_incomplete",
  "policy_denied",
  "rate_limited",
  "environment_mismatch",
  "hosted_handoff_unavailable",
  "receipt_superseded",
  "evidence_refresh_required",
  "policy_no_longer_valid",
  "application_inactive",
  "unknown",
] as const;
export type PartnerSafeFailureCode = (typeof PARTNER_SAFE_FAILURE_CODES)[number];

export const INTEGRATION_EVENT_ALLOWED_METADATA_KEYS = [
  "replay_status",
  "verify_request_ref",
  "handoff_status",
  "credential_state",
  "callback_class",
  "webhook_selected",
  "smoke_probe",
  "outcome_class",
  "flow_next",
  "public_code",
  "issues_production_key",
  "idempotency_replay",
] as const;

export const INTEGRATION_EVENT_PROHIBITED_KEYS = [
  "date_of_birth",
  "dob",
  "legal_name",
  "email",
  "government_id",
  "document_number",
  "biometric",
  "passport",
  "wallet_address",
  "sui_address",
  "callback_url",
  "return_url",
  "api_key",
  "production_api_key",
  "webhook_secret",
  "signing_secret",
  "raw",
  "signature",
  "claims_json",
  "provider_payload",
  "activity_signal",
  "stack",
  "sqlstate",
] as const;

export const INTEGRATION_HEALTH_STATUSES = ["healthy", "degraded", "blocked"] as const;
export type IntegrationHealthStatus = (typeof INTEGRATION_HEALTH_STATUSES)[number];

export const INTEGRATION_OBSERVABILITY_NOTICE =
  "Integration observability records operational lifecycle events only. It never stores identity evidence, credentials, callback URLs, or webhook secrets.";
