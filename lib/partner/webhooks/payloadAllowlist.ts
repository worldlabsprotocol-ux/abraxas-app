// FILE: lib/partner/webhooks/payloadAllowlist.ts
// Dependency-neutral webhook payload key allowlists. No disclosure or outbox imports.

export const WEBHOOK_PAYLOAD_ALLOWED_KEYS = [
  "event_id",
  "schema_version",
  "event_type",
  "timestamp",
  "occurred_at",
  "partner_id",
  "policy_id",
  "policy_version",
  "receipt_id",
  "decision_id",
  "outcome",
  "reason_code",
  "signature",
] as const;

export const WEBHOOK_TEST_PAYLOAD_ALLOWED_KEYS = [
  "event_id",
  "event_type",
  "occurred_at",
  "partner_id",
  "test",
] as const;

export const WEBHOOK_TEST_PAYLOAD_FORBIDDEN_KEYS = [
  "policy_id",
  "receipt_id",
  "decision_id",
  "reason_code",
] as const;

export const WEBHOOK_PII_FORBIDDEN_KEYS = [
  "email",
  "oauth_sub",
  "wallet",
  "wallet_address",
  "sui_address",
  "subject_id",
  "subject_sui",
  "claims",
  "claims_json",
  "credential_jwt",
  "jwt",
  "id_token",
  "oauth_token",
  "document",
  "document_image",
  "image",
  "selfie",
  "biometric",
  "storage_path",
  "admin_note",
  "reviewer_note",
  "date_of_birth",
  "dob",
  "legal_name",
  "full_name",
  "given_name",
  "family_name",
  "profile",
  "user_profile",
] as const;
