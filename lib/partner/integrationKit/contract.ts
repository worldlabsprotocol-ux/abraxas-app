// FILE: lib/partner/integrationKit/contract.ts
// Versioned Partner Integration Kit contract. Documents actual receipt behavior.

export const PARTNER_INTEGRATION_KIT_VERSION = "1.1.0" as const;
export const PARTNER_INTEGRATION_RECEIPT_SCHEMA_VERSION = "1.0.0" as const;

export const PARTNER_INTEGRATION_OUTCOMES = [
  "permitted",
  "denied",
  "expired",
  "revoked",
  "wrong_partner",
  "wrong_policy",
  "wrong_policy_version",
  "policy_version_missing",
  "policy_version_unknown",
  "policy_version_draft",
  "policy_version_deprecated",
  "policy_version_not_yet_effective",
  "policy_version_not_adopted",
  "invalid_signature",
  "environment_mismatch",
  "invalid",
  "retry",
] as const;

export type PartnerIntegrationOutcome = (typeof PARTNER_INTEGRATION_OUTCOMES)[number];

export const PARTNER_INTEGRATION_TRUSTED_RECEIPT_FIELDS = [
  "receipt_id",
  "schema_version",
  "policy_id",
  "policy_version",
  "partner_id",
  "decision_result",
  "status",
  "expires_at",
  "signature_valid",
  "currently_valid",
  "production_usable",
  "decision_context",
  "artifact_type",
] as const;

export const PARTNER_INTEGRATION_CALLBACK_KEYS = [
  "receipt_id",
  "decision",
  "status",
  "decision_id",
  "receipt_expires_at",
  "credential_id",
  "policy_id",
  "partner_id",
] as const;

export const PARTNER_INTEGRATION_FORBIDDEN_CALLBACK_KEYS = [
  "email",
  "date_of_birth",
  "dob",
  "legal_name",
  "wallet",
  "wallet_address",
  "jwt",
  "id_token",
  "credential_jwt",
  "selfie",
  "document",
  "passport_image",
] as const;

export const PARTNER_INTEGRATION_ERROR_CODES = [
  "callback_untrusted",
  "receipt_id_missing",
  "receipt_fetch_failed",
  "receipt_missing",
  "signature_invalid",
  "partner_mismatch",
  "policy_mismatch",
  "policy_version_missing",
  "policy_version_mismatch",
  "policy_version_unknown",
  "policy_version_draft",
  "policy_version_deprecated",
  "policy_version_not_yet_effective",
  "policy_version_not_adopted",
  "decision_not_approved",
  "receipt_expired",
  "receipt_revoked",
  "environment_mismatch",
  "schema_version_unsupported",
  "pii_in_callback",
] as const;

export const PARTNER_INTEGRATION_REPLAY_BEHAVIOR =
  "Public receipt verification is not a one time consume. A currently valid receipt can be fetched and evaluated again. Partner Flow evaluate has separate request idempotency. Do not treat public GET as replay protection.";

export const PARTNER_INTEGRATION_SANDBOX_BEHAVIOR =
  "Sandbox receipts have production_usable false and decision_context sandbox_only. Production mode must reject them. Sandbox mode requires an explicit allowSandbox flag.";

export const PARTNER_INTEGRATION_GOOGLE_BOUNDARY =
  "Google sign in creates an Abraxas account. It does not prove age, identity, residency, or eligibility.";

export const PARTNER_INTEGRATION_SOURCE_LEVEL =
  "The Partner Integration Kit is source level code in this repository (lib/partner/integrationKit). It is not a published npm package.";
