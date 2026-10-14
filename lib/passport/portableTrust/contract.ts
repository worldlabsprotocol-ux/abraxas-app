// FILE: lib/passport/portableTrust/contract.ts
// Build #565 — holder-controlled portable trust (no signing secrets).

export const PASSPORT_PORTABLE_TRUST_BUILD = 565 as const;

export const HOLDER_PORTABLE_EXPORT_MEDIA_TYPE =
  "application/vnd.abraxas.holder-portable-presentation+json" as const;

export const HOLDER_PORTABLE_EXPORT_SCHEMA_VERSION = "1.0.0" as const;

/** Holder-visible summary — no raw claim values, no wallet address. */
export type HolderPortableCredentialSummary = {
  receipt_id: string;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  decision_result: "approved" | "denied" | "manual_review";
  status: "active" | "expired" | "revoked";
  evaluated_at: string;
  expires_at: string | null;
  issuer_refs: string[];
  assurance_labels: string[];
  audience_bound: true;
  recovery_note: string;
};

/** Export bundle the holder can store offline — presentation only. */
export type HolderPortablePresentationExport = {
  media_type: typeof HOLDER_PORTABLE_EXPORT_MEDIA_TYPE;
  schema_version: typeof HOLDER_PORTABLE_EXPORT_SCHEMA_VERSION;
  exported_at: string;
  presentation: import("@/lib/protocol/proofFirst/holderPolicyPresentation").HolderPolicyScopedPresentation;
  credential_summary: HolderPortableCredentialSummary;
  privacy: {
    linkable_fields: string[];
    not_disclosed: string[];
    selective_disclosure_honesty: string;
  };
  portability_limits: string[];
};
