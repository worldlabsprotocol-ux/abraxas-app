// FILE: lib/protocol/proofFirst/evidenceCustodyBoundary.ts
// Minimum-custody evidence classification — declarative boundaries only (no deletion jobs).

export const EVIDENCE_CUSTODY_POLICY_VERSION = "563.1.0" as const;

export type EvidenceProcessingClass =
  | "ephemeral_processing_only"
  | "encrypted_custody_until_credential_issued"
  | "commitment_substitutable"
  | "audit_without_pii"
  | "must_not_retain_for_partner_verification";

export type EvidenceCustodyRule = {
  id: string;
  class: EvidenceProcessingClass;
  examples: string[];
  partner_verification_requires: boolean;
  holder_export_relevant: boolean;
  deletion_boundary: string;
};

/** Aligns with selective-disclosure forbidden classes; does not mutate storage. */
export const EVIDENCE_CUSTODY_RULES: readonly EvidenceCustodyRule[] = [
  {
    id: "gov_id_image",
    class: "ephemeral_processing_only",
    examples: ["passport_documents", "capture_session blobs"],
    partner_verification_requires: false,
    holder_export_relevant: true,
    deletion_boundary: "Delete or holder-export after credential issuance when operator policy authorizes — not automated in Build #563.",
  },
  {
    id: "biometric_samples",
    class: "ephemeral_processing_only",
    examples: ["liveness frames", "face match intermediates"],
    partner_verification_requires: false,
    holder_export_relevant: false,
    deletion_boundary: "Retain only derived assurance flags on claims; raw biometrics must not be required for RP checks.",
  },
  {
    id: "encrypted_evidence_blobs",
    class: "encrypted_custody_until_credential_issued",
    examples: ["abraxas_evidence_custody encrypted payloads"],
    partner_verification_requires: false,
    holder_export_relevant: true,
    deletion_boundary: "Replace with signed claim refs + issuer assurance on receipt; custody is issuer convenience not RP dependency.",
  },
  {
    id: "claim_commitments",
    class: "commitment_substitutable",
    examples: ["evaluated_claim_refs on DecisionReceiptRecord"],
    partner_verification_requires: true,
    holder_export_relevant: true,
    deletion_boundary: "Partners verify signed claims metadata, not underlying documents.",
  },
  {
    id: "issuance_audit",
    class: "audit_without_pii",
    examples: ["sovereign_credential_issuance_audit subject hashes"],
    partner_verification_requires: false,
    holder_export_relevant: false,
    deletion_boundary: "Operational audit may retain pseudonymous subject ids; not shared with RPs in proof-first path.",
  },
  {
    id: "provider_raw_payload",
    class: "must_not_retain_for_partner_verification",
    examples: ["Veriff session payloads", "Supabase auth JWT material"],
    partner_verification_requires: false,
    holder_export_relevant: false,
    deletion_boundary: "Category D transport; must not gate independent receipt verification.",
  },
];

export function rulesRequiredForPartnerVerification(): EvidenceCustodyRule[] {
  return EVIDENCE_CUSTODY_RULES.filter((r) => r.partner_verification_requires);
}
