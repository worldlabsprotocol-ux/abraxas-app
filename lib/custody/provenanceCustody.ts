// FILE: lib/custody/provenanceCustody.ts
// Content provenance reference custody analysis.

export const PROVENANCE_CUSTODY_VERSION = "1.0.0" as const;

export const PROVENANCE_CUSTODY_MODEL = [
  {
    dataType: "Raw photograph / manuscript / audio / video",
    preferredCustody: "Holder device or authorized source; not Abraxas permanent store",
    abraxasRetention: "Not retained",
    storageClass: "raw_evidence",
  },
  {
    dataType: "Artifact fingerprint (SHA-256)",
    preferredCustody: "Abraxas content_artifact_records",
    abraxasRetention: "Hash + metadata only until revoked",
    storageClass: "commitment",
  },
  {
    dataType: "Creator disclosure / AI assistance category",
    preferredCustody: "Signed credential claim",
    abraxasRetention: "credential_claims minimized claim_value",
    storageClass: "credential",
  },
  {
    dataType: "Policy evaluation result",
    preferredCustody: "Signed decision receipt",
    abraxasRetention: "Immutable receipt without raw media",
    storageClass: "receipt",
  },
] as const;

export const PROVENANCE_FORBIDDEN_RETENTION = [
  "Raw media bytes in database",
  "Base64 content in receipts",
  "claim_value in public receipt views",
  "Media MIME types in public receipt JSON",
] as const;

export const PROVENANCE_GUARD_INTEGRATION = "provenanceReceiptIsPublicSafe" as const;
