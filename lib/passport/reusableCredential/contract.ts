// FILE: lib/passport/reusableCredential/contract.ts
// Build #566 — issuer-signed reusable Passport credential (distinct from partner authorization receipts).

export const PASSPORT_REUSABLE_CREDENTIAL_BUILD = 566 as const;

export const PASSPORT_REUSABLE_CREDENTIAL_MEDIA_TYPE =
  "application/vnd.abraxas.passport-reusable-credential+json" as const;

export const PASSPORT_REUSABLE_CREDENTIAL_SCHEMA_VERSION = "1.0.0" as const;

/** Claim reference embedded in credential — no raw PII or document payloads. */
export type PassportCredentialClaimAssertion = {
  claim_id: string;
  claim_type: string;
  /** Issuer authenticated semantic outcome (e.g. over_21). Required for policy evaluation. */
  authenticated_outcome: string;
  authentication_method: "issuer_signed_assertion";
  /** Evidence hash pointer only. Never used as the eligibility outcome. */
  claim_evidence_ref: string;
  issuer_id: string;
  assurance_level: "L0" | "L1" | "L2" | "L3" | "L4";
  issued_at: string;
  expires_at: string | null;
  status: "active" | "revoked" | "expired";
};

export type PassportCredentialAssuranceProvenance = {
  idv_method: "authorized_issuer" | "manual_review" | "sandbox_fixture";
  evidence_reference_hash: string;
  wallet_ownership_not_sufficient: true;
};

/** Canonical signed payload — not interchangeable with DecisionReceiptCanonicalPayload. */
export type PassportReusableCredentialPayload = {
  credential_id: string;
  schema_version: typeof PASSPORT_REUSABLE_CREDENTIAL_SCHEMA_VERSION;
  issuer_id: string;
  signing_key_id: string;
  holder_subject_id: string;
  /** Ed25519 public key (base64url) for challenge response verification. */
  holder_possession_public_key: string;
  /** Issuer recorded binding reference — not sufficient alone for presentation. */
  holder_possession_ref: string;
  assurance_level: "L2" | "L3" | "L4";
  provenance: PassportCredentialAssuranceProvenance;
  asserted_claims: PassportCredentialClaimAssertion[];
  issued_at: string;
  expires_at: string;
  revocation_status_id: string;
  custody_note: "credential_export_not_account_recovery";
};

export type SignedPassportReusableCredential = {
  media_type: typeof PASSPORT_REUSABLE_CREDENTIAL_MEDIA_TYPE;
  payload: PassportReusableCredentialPayload;
  payload_hash: string;
  signature: string;
};

/** Holder-visible summary for /passport UI. */
export type PassportReusableCredentialSummary = {
  credential_id: string;
  issuer_id: string;
  assurance_level: string;
  claim_labels: string[];
  issued_at: string;
  expires_at: string;
  status: "active" | "expired" | "revoked";
  sandbox_labeled: boolean;
  limitations: string[];
  not_a_partner_receipt: true;
};

/** Partner presentation request disclosure (holder consent). */
export type PassportPresentationRequestDisclosure = {
  relying_party_id: string;
  relying_party_label: string;
  policy_id: string;
  requested_attribute: string;
  purpose: string;
  partner_receives: string;
  credential_id: string;
};
