// FILE: lib/passport/reusableEligibility/contract.ts
// Consent-bound reusable eligibility facts. Internal model. Not a global identity.

export const REUSABLE_ELIGIBILITY_VERSION = "1.0.0" as const;

export const REUSE_COMPATIBILITY_RULE =
  "exact_pack_and_version_or_reviewed_compatibility_edge" as const;

export const REUSE_LIFECYCLE_RULE =
  "source_withdrawal_invalidates_derived_future_checks" as const;

export const REUSE_METHOD_ID = "reuse_existing_proof" as const;

export const REUSE_LABEL = "Use an existing private verification";

export const REUSE_CONFIRM_POINTS = [
  "A previous private verification may satisfy this request.",
  "The new partner receives only this policy’s result.",
  "The original partner and original receipt are not disclosed.",
  "You may instead complete another qualifying method.",
  "Selecting reuse does not issue a result.",
  "Explicit consent is still required before a new partner-bound result is issued.",
] as const;

export const REUSE_CONSENT_STILL_REQUIRED =
  "Selecting this option does not issue a result. You still need to consent before a new partner-bound result is created.";

export const REUSE_PASSPORT_NOTICE =
  "A current result can be reused for a later compatible request only if you give fresh consent. Future partners are not listed here.";

export const REUSE_UNAVAILABLE =
  "Existing private verification is temporarily unavailable. Choose another qualifying method or try again.";

export const REUSE_NONE =
  "No compatible private verification is available for this request.";

export const REUSE_EXPIRED =
  "The previous private verification is no longer current. Complete a qualifying method again.";

export const REUSE_REVOKED =
  "The previous private verification was withdrawn. Complete a qualifying method again.";

export const REUSE_INCOMPATIBLE =
  "This request is not compatible with a previous private verification.";

export const REUSE_SANDBOX_BLOCKED =
  "A sandbox or test result cannot satisfy a Production policy.";

export const REUSE_CLIENT_KEYS = [
  "available",
  "state",
  "label",
  "explanation",
  "consent_still_required",
  "issuedReceipt",
] as const;

export type ReuseClientState =
  | "none"
  | "available"
  | "expired"
  | "revoked"
  | "incompatible"
  | "sandbox_blocked"
  | "unavailable";

export interface ReuseClientView {
  available: boolean;
  state: ReuseClientState;
  label: string;
  explanation: string[];
  consent_still_required: true;
  issuedReceipt: false;
}

export interface InternalReusableFact {
  fact_id: string;
  subject_pseudonym_id: string;
  pack_id: string;
  policy_version: number;
  minimum_assurance: string;
  method_category: string;
  result_category: string;
  disclosure_boundary: string;
  decision_context: "production" | "sandbox_only";
  source_decision_id: string;
  source_receipt_id: string;
  issued_at: string;
  expires_at: string | null;
  status: "active" | "expired" | "revoked";
}
