// FILE: lib/provenance/types.ts
// Content provenance domain types — evidence-backed, not AI detection.

/** Canonical provenance claim identifiers. Distinct from identity/eligibility claims. */
export type ProvenanceClaimType =
  | "creator_attested"
  | "ai_assistance_disclosed"
  | "source_integrity_verified"
  | "capture_provenance_verified";

export type ProvenanceEvidenceKind =
  | "creator_attestation"
  | "ai_disclosure_form"
  | "artifact_fingerprint"
  | "capture_manifest"
  | "external_adapter";

export type AiAssistanceCategory =
  | "none_declared"
  | "editing_assistance"
  | "generative_assistance"
  | "substantially_generated";

/** Semantic class — what the claim actually proves. Never upgrade across classes. */
export type ProvenanceAssertionClass =
  | "attestation"
  | "disclosure"
  | "integrity"
  | "capture"
  | "identity"
  | "rights";

export interface ContentArtifactBinding {
  artifact_id: string;
  content_hash: string;
  content_type: string;
  byte_length: number;
  canonicalization_version: string;
  subject_id: string;
  parent_artifact_id?: string | null;
  binding_method: ProvenanceEvidenceKind;
  created_at: string;
}

export interface ProvenancePolicyQuestion {
  pack_id: string;
  question: string;
  required_claim: ProvenanceClaimType;
  disclosed_result: string;
  minimum_assurance: "L0" | "L1" | "L2";
}

export interface ProvenanceEvaluationInput {
  artifactBinding?: ContentArtifactBinding | null;
  submittedContentHash?: string | null;
  claims: Array<{
    claim_type: string;
    assurance_level: string | null;
    claim_value: Record<string, unknown>;
    status: string;
    evidence_reference?: string | null;
  }>;
  policyPackId: string;
}

export interface ProvenanceEvaluationResult {
  approved: boolean;
  disclosed_result: string | null;
  reason_codes: string[];
  evaluated_claim_types: string[];
}
