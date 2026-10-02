// FILE: lib/custody/types.ts
// Canonical storage classification for Abraxas data minimization.

export const STORAGE_CLASSES = [
  "raw_evidence",
  "encrypted_holder_evidence",
  "derived_fact",
  "credential",
  "commitment",
  "receipt",
  "audit_metadata",
  "public_result",
] as const;

export type StorageClass = (typeof STORAGE_CLASSES)[number];

/** Audit classification A–F from custody review (orthogonal to storage class). */
export const CUSTODY_AUDIT_CLASSES = [
  "A_ephemeral",
  "B_raw_identity_evidence",
  "C_minimized_audit_metadata",
  "D_policy_outcome",
  "E_partner_artifact",
  "F_account_immutable_ops",
] as const;

export type CustodyAuditClass = (typeof CUSTODY_AUDIT_CLASSES)[number];

export const CUSTODY_SURFACES = [
  "database_persist",
  "partner_webhook",
  "public_receipt",
  "partner_api",
  "query_parameter",
  "application_log",
  "chain_commitment",
  "browser_storage",
  "holder_export",
] as const;

export type CustodySurface = (typeof CUSTODY_SURFACES)[number];

export type PersistencePolicy =
  | "transient"
  | "ttl"
  | "retained_until_purge"
  | "immutable_audit"
  | "prohibited";

export interface StorageClassRules {
  storageClass: StorageClass;
  persistence: PersistencePolicy;
  partnerDisclosure: "never" | "narrow_policy_result" | "claim_ref_only";
  webhookEligible: boolean;
  publicReceiptEligible: boolean;
  chainEligible: boolean;
  urlEligible: boolean;
  logEligible: "never" | "metadata_only" | "allowed";
  defaultRetentionNote: string;
}

export interface DataCustodyEntry {
  id: string;
  dataType: string;
  origin: string;
  processor: string;
  currentStorage: string;
  retention: string;
  access: string;
  necessity: string;
  storageClass: StorageClass;
  auditClass: CustodyAuditClass;
  rawNecessary: boolean;
}

export type TrustRole =
  | "holder"
  | "issuer"
  | "verifier"
  | "abraxas_policy_engine"
  | "relying_party";

export interface CustodyGuardrailViolation {
  code: string;
  path: string;
  storageClass?: StorageClass;
  surface: CustodySurface;
}

export interface CustodyGuardrailResult {
  ok: boolean;
  violations: CustodyGuardrailViolation[];
}
