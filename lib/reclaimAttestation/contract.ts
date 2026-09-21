// FILE: lib/reclaimAttestation/contract.ts
// Server-only Reclaim private attestation adapter. Not a generic identity product.

export const RECLAIM_ATTESTATION_VERSION = "1.0.0" as const;
export const RECLAIM_ATTESTATION_DOCS = "/docs/reclaim-private-attestations" as const;
export const RECLAIM_CALLBACK_PATH = "/api/reclaim/callback" as const;
export const RECLAIM_SESSION_TTL_MS = 15 * 60 * 1000;
export const RECLAIM_HOLDER_COPY = "Verify one required fact privately." as const;

export const RECLAIM_ATTESTATION_NOTICE =
  "Abraxas verifies a Reclaim proof on the server, maps one approved result into policy evaluation, then continues the existing consent and receipt flow. Partners never receive the raw proof, source website data, extracted parameters, or provider payload.";

export const RECLAIM_SESSION_STATUSES = [
  "created",
  "accepted",
  "cancelled",
  "expired",
  "invalid",
  "replayed",
] as const;
export type ReclaimSessionStatus = (typeof RECLAIM_SESSION_STATUSES)[number];

export const RECLAIM_PUBLIC_SESSION_KEYS = [
  "session_ref",
  "status",
  "expires_at",
  "method_category",
  "result_class",
  "assurance_level",
  "environment",
  "configuration_present",
  "issued_receipt",
  "consent_required",
  "next_action",
  "holder_copy",
] as const;

export const RECLAIM_BROWSER_CONFIG_KEYS = [
  "session_ref",
  "request_config",
  "expires_at",
  "holder_copy",
  "issued_receipt",
] as const;

export const RECLAIM_FORBIDDEN_PERSIST = [
  "raw_proof",
  "proof_json",
  "extracted_parameters",
  "extracted_values",
  "claims",
  "source_website",
  "signatures",
  "witness",
  "tee_material",
  "email",
  "legal_name",
  "date_of_birth",
  "wallet",
  "callback_url",
  "app_secret",
  "api_key",
  "provider_payload",
] as const;
