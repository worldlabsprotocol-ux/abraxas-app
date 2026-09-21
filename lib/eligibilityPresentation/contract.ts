// FILE: lib/eligibilityPresentation/contract.ts
// Interoperable server-to-server eligibility presentation. Not a passport or bearer token.

export const ELIGIBILITY_PRESENTATION_VERSION = "1.0.0" as const;
export const ELIGIBILITY_PRESENTATION_MEDIA_TYPE =
  "application/abraxas-eligibility-presentation+json" as const;
export const ELIGIBILITY_PRESENTATION_DOCS = "/docs/eligibility-presentation-protocol" as const;
export const ELIGIBILITY_PRESENTATION_WELL_KNOWN = "/.well-known/abraxas-eligibility" as const;
export const ELIGIBILITY_PRESENTATION_SCHEMA_PATH =
  "/api/v1/eligibility-presentations/schema" as const;
export const ELIGIBILITY_PRESENTATION_SIGNING_KEYS = "/api/receipts/verification-keys" as const;
export const ELIGIBILITY_PRESENTATION_RECEIPT_VERIFY = "/api/receipts/{id}/public" as const;
export const ELIGIBILITY_PRESENTATION_ISSUER = "abraxas" as const;
export const ELIGIBILITY_PRESENTATION_TTL_MS = 15 * 60 * 1000;

export const ELIGIBILITY_PRESENTATION_NOTICE =
  "A presentation is one audience-bound, one-time eligibility result. It is not a transferable identity passport, not a reusable bearer credential, and not automatic KYC or KYB approval. The partner backend must re-fetch the current public receipt and apply its own policy.";

export const ELIGIBILITY_PRESENTATION_UTILA_NOTICE =
  "These planning categories are Utila-compatible private result shapes only. There is no live Utila API, wallet governance, AML/KYT, quorum, or transaction-policy integration. A protocol such as Utila still runs those controls after an Abraxas result.";

export const ELIGIBILITY_PRESENTATION_ENVIRONMENTS = ["sandbox", "production"] as const;
export type EligibilityPresentationEnvironment =
  (typeof ELIGIBILITY_PRESENTATION_ENVIRONMENTS)[number];

export const ELIGIBILITY_PRESENTATION_REQUEST_STATUSES = [
  "created",
  "issued",
  "expired",
  "revoked",
  "consumed",
] as const;
export type EligibilityPresentationRequestStatus =
  (typeof ELIGIBILITY_PRESENTATION_REQUEST_STATUSES)[number];

export const ELIGIBILITY_PRESENTATION_STATUSES = [
  "issued",
  "consumed",
  "expired",
  "revoked",
  "invalid",
] as const;
export type EligibilityPresentationStatus = (typeof ELIGIBILITY_PRESENTATION_STATUSES)[number];

export const ELIGIBILITY_PRESENTATION_ENVELOPE_KEYS = [
  "schema_version",
  "presentation_ref",
  "issuer",
  "audience_hash",
  "policy_id",
  "policy_version",
  "result_category",
  "currently_valid",
  "environment",
  "issued_at",
  "expires_at",
  "verifier_nonce",
  "signing_key_id",
  "receipt_verification_ref",
  "selective_disclosure_summary",
] as const;

export const ELIGIBILITY_PRESENTATION_PUBLIC_KEYS = [
  ...ELIGIBILITY_PRESENTATION_ENVELOPE_KEYS,
  "media_type",
  "signature",
] as const;

export const ELIGIBILITY_PRESENTATION_FORBIDDEN_KEYS = [
  "legal_name",
  "email",
  "date_of_birth",
  "dob",
  "claims",
  "claims_json",
  "source_fact",
  "wallet",
  "wallet_address",
  "callback_url",
  "callback",
  "api_key",
  "private_key",
  "d",
  "provider_payload",
  "beneficial_owner",
  "corporate_document",
  "kyc_evidence",
  "kyb_evidence",
  "raw_evidence",
  "internal_error",
] as const;

export const ELIGIBILITY_PRESENTATION_CHECKLIST = [
  "Create the presentation request from your backend for one audience, policy, version, action, environment, and nonce.",
  "Redirect the holder to Hosted Partner Flow. Fresh consent is required.",
  "Issue a new audience-bound presentation from the current partner-bound receipt.",
  "Verify signature and key lifecycle, then re-fetch GET /api/receipts/{id}/public before any grant.",
  "A presentation is never a bearer credential or automatic KYC/KYB approval.",
] as const;
