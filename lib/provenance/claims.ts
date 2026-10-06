// FILE: lib/provenance/claims.ts
// Issue provenance claims from evidence — never upgrade assertion class.

import type { AssuranceLevel, CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import { CLAIM_ISSUERS } from "@/lib/credentials/claimSchema";
import type { AiAssistanceCategory } from "./types";
import { buildArtifactEvidenceReference } from "./artifactFingerprint";

const PROVENANCE_SCOPE = "content_provenance" as const;
const CREATOR_ATTESTATION_PROVENANCE = "creator_attestation" as const;
const AI_DISCLOSURE_PROVENANCE = "creator_ai_disclosure" as const;

export function creatorAttestedClaim(input: {
  subjectId: string;
  artifactId: string;
  contentHash: string;
  expiresAt?: Date | null;
}): Omit<CredentialClaimRecord, "id" | "status"> {
  const issuedAt = new Date().toISOString();
  return {
    subject_id: input.subjectId,
    credential_jti: null,
    claim_type: "creator_attested",
    claim_value: {
      artifact_id: input.artifactId,
      content_hash: input.contentHash,
      provenance: CREATOR_ATTESTATION_PROVENANCE,
      assertion_class: "attestation",
    },
    issuer_id: CLAIM_ISSUERS.abraxas,
    assurance_level: "L0",
    issued_at: issuedAt,
    expires_at: input.expiresAt?.toISOString() ?? null,
    revocation_reference: null,
    evidence_reference: buildArtifactEvidenceReference(input.artifactId),
    jurisdiction: null,
    policy_scope: PROVENANCE_SCOPE,
  };
}

export function aiAssistanceDisclosedClaim(input: {
  subjectId: string;
  artifactId: string;
  contentHash: string;
  category: AiAssistanceCategory;
  expiresAt?: Date | null;
}): Omit<CredentialClaimRecord, "id" | "status"> {
  const issuedAt = new Date().toISOString();
  return {
    subject_id: input.subjectId,
    credential_jti: null,
    claim_type: "ai_assistance_disclosed",
    claim_value: {
      artifact_id: input.artifactId,
      content_hash: input.contentHash,
      category: input.category,
      provenance: AI_DISCLOSURE_PROVENANCE,
      assertion_class: "disclosure",
      detection: false,
    },
    issuer_id: CLAIM_ISSUERS.abraxas,
    assurance_level: "L0",
    issued_at: issuedAt,
    expires_at: input.expiresAt?.toISOString() ?? null,
    revocation_reference: null,
    evidence_reference: buildArtifactEvidenceReference(input.artifactId),
    jurisdiction: null,
    policy_scope: PROVENANCE_SCOPE,
  };
}

export function sourceIntegrityVerifiedClaim(input: {
  subjectId: string;
  artifactId: string;
  contentHash: string;
  assuranceLevel?: AssuranceLevel;
  expiresAt?: Date | null;
}): Omit<CredentialClaimRecord, "id" | "status"> {
  const issuedAt = new Date().toISOString();
  return {
    subject_id: input.subjectId,
    credential_jti: null,
    claim_type: "source_integrity_verified",
    claim_value: {
      artifact_id: input.artifactId,
      content_hash: input.contentHash,
      assertion_class: "integrity",
      verified_at: issuedAt,
    },
    issuer_id: CLAIM_ISSUERS.abraxas,
    assurance_level: input.assuranceLevel ?? "L1",
    issued_at: issuedAt,
    expires_at: input.expiresAt?.toISOString() ?? null,
    revocation_reference: null,
    evidence_reference: buildArtifactEvidenceReference(input.artifactId),
    jurisdiction: null,
    policy_scope: PROVENANCE_SCOPE,
  };
}
