// FILE: lib/custody/storageClassification.ts
// Explicit rules per storage class — data minimization defaults.

import type { StorageClass, StorageClassRules } from "./types";

export const STORAGE_CLASS_RULES: Record<StorageClass, StorageClassRules> = {
  raw_evidence: {
    storageClass: "raw_evidence",
    persistence: "retained_until_purge",
    partnerDisclosure: "never",
    webhookEligible: false,
    publicReceiptEligible: false,
    chainEligible: false,
    urlEligible: false,
    logEligible: "never",
    defaultRetentionNote: "Operator-configured purge window; never partner-visible.",
  },
  encrypted_holder_evidence: {
    storageClass: "encrypted_holder_evidence",
    persistence: "ttl",
    partnerDisclosure: "never",
    webhookEligible: false,
    publicReceiptEligible: false,
    chainEligible: false,
    urlEligible: false,
    logEligible: "never",
    defaultRetentionNote: "Holder-controlled or Abraxas-encrypted vault; Abraxas cannot decrypt by default.",
  },
  derived_fact: {
    storageClass: "derived_fact",
    persistence: "ttl",
    partnerDisclosure: "narrow_policy_result",
    webhookEligible: false,
    publicReceiptEligible: false,
    chainEligible: false,
    urlEligible: false,
    logEligible: "metadata_only",
    defaultRetentionNote: "Smallest reusable fact (e.g. age_over_21); not source evidence.",
  },
  credential: {
    storageClass: "credential",
    persistence: "ttl",
    partnerDisclosure: "claim_ref_only",
    webhookEligible: false,
    publicReceiptEligible: false,
    chainEligible: false,
    urlEligible: false,
    logEligible: "metadata_only",
    defaultRetentionNote: "Signed issuer claim; partners verify refs, not claim_value by default.",
  },
  commitment: {
    storageClass: "commitment",
    persistence: "immutable_audit",
    partnerDisclosure: "never",
    webhookEligible: false,
    publicReceiptEligible: false,
    chainEligible: true,
    urlEligible: false,
    logEligible: "metadata_only",
    defaultRetentionNote: "Hash/commitment only; never reversible PII.",
  },
  receipt: {
    storageClass: "receipt",
    persistence: "immutable_audit",
    partnerDisclosure: "narrow_policy_result",
    webhookEligible: true,
    publicReceiptEligible: true,
    chainEligible: false,
    urlEligible: false,
    logEligible: "metadata_only",
    defaultRetentionNote: "Signed policy result; claim refs without values.",
  },
  audit_metadata: {
    storageClass: "audit_metadata",
    persistence: "immutable_audit",
    partnerDisclosure: "never",
    webhookEligible: false,
    publicReceiptEligible: false,
    chainEligible: false,
    urlEligible: false,
    logEligible: "metadata_only",
    defaultRetentionNote: "Operational/security audit; not holder export by default.",
  },
  public_result: {
    storageClass: "public_result",
    persistence: "transient",
    partnerDisclosure: "narrow_policy_result",
    webhookEligible: true,
    publicReceiptEligible: true,
    chainEligible: false,
    urlEligible: true,
    logEligible: "allowed",
    defaultRetentionNote: "Partner-safe outcome category only.",
  },
};

export function rulesForStorageClass(storageClass: StorageClass): StorageClassRules {
  return STORAGE_CLASS_RULES[storageClass];
}

export function isStorageClassAllowedOnSurface(
  storageClass: StorageClass,
  surface: keyof Pick<
    StorageClassRules,
    "webhookEligible" | "publicReceiptEligible" | "chainEligible" | "urlEligible"
  >,
): boolean {
  return STORAGE_CLASS_RULES[storageClass][surface];
}
