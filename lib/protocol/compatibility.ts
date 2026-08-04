// FILE: lib/protocol/compatibility.ts
// Frozen public contract versions for beta — no new framework.

/** Decision receipt schema version issued at beta freeze. */
export const DECISION_RECEIPT_SCHEMA_VERSION = "1.0.0";

/** Trust Decision JSON shape version (verify API). */
export const TRUST_DECISION_API_VERSION = "1.0.0";

/** Partner callback query parameters (no PII). */
export const PARTNER_CALLBACK_PARAMS = [
  "status",
  "decision_id",
  "receipt_id",
  "receipt_expires_at",
  "credential_id",
  "policy_id",
  "partner_id",
] as const;

/** Supported partner-flow browser API response fields (additive only post-beta). */
export const PARTNER_FLOW_RESPONSE_FIELDS = [
  "next",
  "redirect_url",
  "passport_url",
  "verification_request_id",
  "partner_result",
  "reason_codes",
  "flow_trace_id",
] as const;

/** Public receipt view fields partners rely on. */
export const PUBLIC_RECEIPT_VIEW_FIELDS = [
  "receipt_id",
  "schema_version",
  "policy_id",
  "policy_version",
  "partner_id",
  "decision_result",
  "signature_valid",
  "payload_hash",
  "signing_key_id",
  "production_usable",
  "decision_context",
] as const;

export const COMPATIBILITY_POLICY = {
  additive_only: true,
  breaking_changes_require: "major version bump + PROTOCOL_COMPATIBILITY.md update",
  beta_baseline_tag: "v1.0.0-beta.0",
} as const;

/** Frozen public field sets — compatibility tests assert live output matches these exactly. */
export const FROZEN_TRUST_DECISION_KEYS = [
  "decision_id",
  "approved",
  "decision",
  "permission",
  "permission_version",
  "trust_level",
  "valid_until",
  "reason_codes",
  "status",
  "decided_at",
  "policy_id",
  "policy_version",
  "relying_party_id",
  "proof",
] as const;

export const FROZEN_TRUST_DECISION_PROOF_KEYS = [
  "receipt_id",
  "schema_version",
  "signature",
  "signing_key_id",
  "payload_hash",
  "verify_url",
] as const;

export const FROZEN_PUBLIC_RECEIPT_VIEW_KEYS = [
  "receipt_id",
  "schema_version",
  "policy_id",
  "policy_version",
  "partner_id",
  "subject_pseudonym_id",
  "decision_result",
  "reason_codes",
  "evaluated_claim_refs",
  "issuer_refs",
  "decision_context",
  "production_usable",
  "evaluated_at",
  "expires_at",
  "status",
  "payload_hash",
  "signature",
  "signing_key_id",
  "signature_valid",
  "anchor_reference",
  "artifact_type",
] as const;

export const FROZEN_PARTNER_FLOW_EVALUATE_ENTER_KEYS = [
  "next",
  "redirect_url",
  "partner_result",
  "flow_trace_id",
] as const;

export const FROZEN_PARTNER_VERIFICATION_RESULT_KEYS = [
  "decision",
  "credential_id",
  "issuer",
  "evaluated_at",
  "receipt_id",
  "receipt_expires_at",
  "policy_id",
  "partner_id",
  "identity_verified",
  "over_21",
  "assurance_level",
  "reason_codes",
] as const;
