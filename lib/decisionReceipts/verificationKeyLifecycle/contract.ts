// FILE: lib/decisionReceipts/verificationKeyLifecycle/contract.ts
// Server-owned receipt verification-key lifecycle. Public material only in partner output.

export const RECEIPT_VERIFICATION_KEY_ALGORITHM = "Ed25519" as const;
export const RECEIPT_VERIFICATION_KEY_DOCUMENT = "abraxas_receipt_verification_keys" as const;
export const RECEIPT_VERIFICATION_REGISTRY_ENV = "ABRAXAS_RECEIPT_VERIFICATION_REGISTRY";

export const RECEIPT_KEY_ENVIRONMENTS = ["demo", "production"] as const;
export type ReceiptKeyEnvironment = (typeof RECEIPT_KEY_ENVIRONMENTS)[number];

export const RECEIPT_KEY_STATUSES = ["active", "retiring", "retired", "revoked"] as const;
export type ReceiptKeyStatus = (typeof RECEIPT_KEY_STATUSES)[number];

export const RECEIPT_KEY_REASON_CLASSES = [
  "active",
  "rotation",
  "superseded",
  "expired",
  "compromise",
  "operator",
  "schema_mismatch",
  "unavailable",
  "inconsistent",
] as const;
export type ReceiptKeyReasonClass = (typeof RECEIPT_KEY_REASON_CLASSES)[number];

export const RECEIPT_KEY_PUBLIC_FIELDS = [
  "key_id",
  "algorithm",
  "public_jwk",
  "fingerprint",
  "environment",
  "status",
  "issued_at",
  "not_before",
  "expires_at",
  "issuer_label",
  "schema_versions",
  "reason_class",
] as const;

export const RECEIPT_KEY_DOCUMENT_FIELDS = [
  "document",
  "algorithm",
  "environment",
  "schema_versions",
  "notice",
  "keys",
] as const;

export const RECEIPT_KEY_REJECTED_CLIENT_KEYS = [
  "signing_key_id",
  "key_id",
  "private_key",
  "ABRAXAS_SIGNING_KEY",
  "d",
  "seed",
  "production",
  "activate_production",
  "challenge_authority",
] as const;

export const RECEIPT_KEY_PARTNER_NOTICE =
  "Partners must re-fetch a current public receipt and honor revocation and currently_valid. Verifying a signature against this document is not a grant.";

export const RECEIPT_KEY_ISSUER_LABEL = "Abraxas" as const;

export interface ReceiptVerificationPublicJwk {
  kty: "OKP";
  crv: "Ed25519";
  x: string;
}

export interface ReceiptVerificationKeyRecord {
  key_id: string;
  algorithm: typeof RECEIPT_VERIFICATION_KEY_ALGORITHM;
  environment: ReceiptKeyEnvironment;
  status: ReceiptKeyStatus;
  public_jwk: ReceiptVerificationPublicJwk;
  fingerprint: string;
  issuer_label: string;
  issued_at: string;
  not_before: string;
  expires_at: string | null;
  schema_versions: string[];
  reason_class: ReceiptKeyReasonClass;
  allow_historical_verification: boolean;
  historical_verify_until: string | null;
}

export interface ReceiptVerificationPublicKeyView {
  key_id: string;
  algorithm: typeof RECEIPT_VERIFICATION_KEY_ALGORITHM;
  public_jwk: ReceiptVerificationPublicJwk;
  fingerprint: string;
  environment: ReceiptKeyEnvironment;
  status: ReceiptKeyStatus;
  issued_at: string;
  not_before: string;
  expires_at: string | null;
  issuer_label: string;
  schema_versions: string[];
  reason_class: ReceiptKeyReasonClass;
}

export interface ReceiptVerificationKeyDocument {
  document: typeof RECEIPT_VERIFICATION_KEY_DOCUMENT;
  algorithm: typeof RECEIPT_VERIFICATION_KEY_ALGORITHM;
  environment: ReceiptKeyEnvironment;
  schema_versions: string[];
  notice: typeof RECEIPT_KEY_PARTNER_NOTICE;
  keys: ReceiptVerificationPublicKeyView[];
}

export const RECEIPT_KEY_OPERATOR_STEPS = [
  "Add the new key's public JWK and key ID to ABRAXAS_RECEIPT_VERIFICATION_REGISTRY as status active, environment-scoped, with schema 1.0.0.",
  "Configure ABRAXAS_SIGNING_KEY and ABRAXAS_SIGNING_KEY_ID in that environment only. Never commit private material.",
  "Issue new receipts with the active in-window key. Do not re-sign historical receipts.",
  "Mark the previous key retiring with allow_historical_verification true so existing signatures still verify.",
  "After the overlap window, mark it retired. Historical verification remains allowed only while lifecycle rules say so.",
  "Revoke only for compromise or explicit invalidation. Revoked keys never verify.",
  "Never copy DEMO registry entries or private keys into Production, or the reverse.",
] as const;
