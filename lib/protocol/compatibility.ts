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
