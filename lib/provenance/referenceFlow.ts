// FILE: lib/provenance/referenceFlow.ts
// Minimal reference holder + relying-party flow (photography/publishing vertical).

import {
  aiAssistanceDisclosedClaim,
  creatorAttestedClaim,
  sourceIntegrityVerifiedClaim,
} from "./claims";
import { evaluateProvenancePolicy } from "./evaluate";
import { fingerprintArtifact } from "./artifactFingerprint";
import { buildProvenanceConsentPreview } from "./consentPreview";
import type { ContentArtifactBinding } from "./types";

export const REFERENCE_PUBLISHER_PARTNER_ID = "reference-photo-publisher";
export const REFERENCE_MARKETPLACE_PARTNER_ID = "reference-photo-marketplace";

/**
 * Reference journey:
 * 1. Creator uploads photo bytes client-side; only hash sent to Abraxas.
 * 2. Creator attests authorship + discloses AI assistance (L0).
 * 3. Abraxas stores artifact binding (hash only).
 * 4. Publisher asks: ai_assistance_disclosed?
 * 5. Creator approves narrow disclosure.
 * 6. Publisher receives signed receipt with disclosed_result only.
 * 7. Marketplace later asks: source_integrity_verified? against same artifact hash.
 */
export function runReferenceProvenanceFlow(input: {
  subjectId: string;
  artifactId: string;
  photoBytes: Buffer;
  aiCategory: "none_declared" | "editing_assistance";
}) {
  const fingerprint = fingerprintArtifact({
    content: input.photoBytes,
    contentType: "image/jpeg",
  });

  const binding: ContentArtifactBinding = {
    artifact_id: input.artifactId,
    content_hash: fingerprint.content_hash,
    content_type: fingerprint.content_type,
    byte_length: fingerprint.byte_length,
    canonicalization_version: fingerprint.canonicalization_version,
    subject_id: input.subjectId,
    binding_method: "creator_attestation",
    created_at: new Date().toISOString(),
  };

  const attestation = creatorAttestedClaim({
    subjectId: input.subjectId,
    artifactId: input.artifactId,
    contentHash: fingerprint.content_hash,
  });

  const disclosure = aiAssistanceDisclosedClaim({
    subjectId: input.subjectId,
    artifactId: input.artifactId,
    contentHash: fingerprint.content_hash,
    category: input.aiCategory,
  });

  const integrity = sourceIntegrityVerifiedClaim({
    subjectId: input.subjectId,
    artifactId: input.artifactId,
    contentHash: fingerprint.content_hash,
  });

  const publisherPreview = buildProvenanceConsentPreview("content_ai_disclosure");
  const publisherEval = evaluateProvenancePolicy({
    policyPackId: "content_ai_disclosure",
    artifactBinding: binding,
    submittedContentHash: fingerprint.content_hash,
    claims: [
      { ...disclosure, status: "active" },
      { ...attestation, status: "active" },
    ],
  });

  const marketplaceEval = evaluateProvenancePolicy({
    policyPackId: "content_source_integrity",
    artifactBinding: binding,
    submittedContentHash: fingerprint.content_hash,
    claims: [{ ...integrity, status: "active" }],
  });

  const tamperedEval = evaluateProvenancePolicy({
    policyPackId: "content_source_integrity",
    artifactBinding: binding,
    submittedContentHash: fingerprintArtifact({
      content: Buffer.from("tampered"),
      contentType: "image/jpeg",
    }).content_hash,
    claims: [{ ...integrity, status: "active" }],
  });

  return {
    binding,
    publisherPreview,
    publisherEval,
    marketplaceEval,
    tamperedEval,
  };
}
