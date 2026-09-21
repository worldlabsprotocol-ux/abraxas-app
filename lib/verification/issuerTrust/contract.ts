// FILE: lib/verification/issuerTrust/contract.ts
// Server-owned verification issuer trust. Not a KYC marketplace or live guarantee.

export const VERIFICATION_ISSUER_TRUST_VERSION = "1.0.0" as const;
export const VERIFICATION_ISSUER_TRUST_DOCS = "/docs/verification-issuer-trust" as const;
export const VERIFICATION_ISSUER_TRUST_NOTICE =
  "A registry entry is not a provider partnership, a live verification guarantee, or a selectable KYC marketplace. Abraxas remains the method-qualification authority.";
export const NO_VERIFIED_METHOD = "No verified method is available yet." as const;
export const HOLDER_APPROVED_METHOD =
  "This policy requires an approved verification method." as const;

export const ISSUER_TRUST_STATUSES = [
  "active",
  "retiring",
  "disabled",
  "review_required",
] as const;
export type IssuerTrustStatus = (typeof ISSUER_TRUST_STATUSES)[number];

export const ISSUER_TRUST_STATUS_LABELS: Record<IssuerTrustStatus, string> = {
  active: "Active",
  retiring: "Retiring",
  disabled: "Disabled",
  review_required: "Review required",
};

export const ISSUER_INTEGRATION_STATES = ["integrated", "integration_ready", "planned"] as const;
export type IssuerIntegrationState = (typeof ISSUER_INTEGRATION_STATES)[number];

export const ISSUER_SUBJECT_BINDINGS = [
  "abraxas_account",
  "wallet_control",
  "session_only",
] as const;
export type IssuerSubjectBinding = (typeof ISSUER_SUBJECT_BINDINGS)[number];

export const ISSUER_TRUST_OVERRIDE_KEYS = [
  "issuer",
  "issuer_id",
  "provider",
  "policy_id",
  "policy_version",
  "pack_id",
  "action",
  "partner_id",
  "receipt",
  "wallet",
  "credential",
  "callback",
  "callback_url",
  "activate_mainnet",
  "activate_production",
  "status",
  "select",
  "publish",
] as const;
