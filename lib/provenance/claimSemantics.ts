// FILE: lib/provenance/claimSemantics.ts
// What each provenance claim may and may not assert.

import type {
  AiAssistanceCategory,
  ProvenanceAssertionClass,
  ProvenanceClaimType,
} from "./types";

export interface ProvenanceClaimSemantics {
  claim_type: ProvenanceClaimType;
  assertion_class: ProvenanceAssertionClass;
  /** Plain-language meaning for holders and partners. */
  establishes: string;
  /** Explicit non-claims — must never be implied visually or in copy. */
  does_not_establish: readonly string[];
  minimum_evidence: string;
  typical_assurance: "L0" | "L1" | "L2";
}

export const PROVENANCE_CLAIM_SEMANTICS: Record<ProvenanceClaimType, ProvenanceClaimSemantics> = {
  creator_attested: {
    claim_type: "creator_attested",
    assertion_class: "attestation",
    establishes: "The holder attested they created or submitted this artifact.",
    does_not_establish: [
      "human_created_verified",
      "identity_verified",
      "authorship_verified",
      "rights_holder_verified",
      "capture_provenance_verified",
    ],
    minimum_evidence: "Signed holder attestation bound to artifact fingerprint.",
    typical_assurance: "L0",
  },
  ai_assistance_disclosed: {
    claim_type: "ai_assistance_disclosed",
    assertion_class: "disclosure",
    establishes: "The holder disclosed whether and how AI tools contributed to the artifact.",
    does_not_establish: [
      "ai_generated_detected",
      "ai_probability_score",
      "human_created_verified",
      "content_authenticity_verified",
    ],
    minimum_evidence: "Holder disclosure form bound to artifact fingerprint.",
    typical_assurance: "L0",
  },
  source_integrity_verified: {
    claim_type: "source_integrity_verified",
    assertion_class: "integrity",
    establishes: "Submitted artifact bytes match a previously established fingerprint.",
    does_not_establish: [
      "human_created_verified",
      "creator_identity_verified",
      "rights_holder_verified",
      "capture_provenance_verified",
      "originality_verified",
    ],
    minimum_evidence: "Deterministic artifact fingerprint match at evaluation time.",
    typical_assurance: "L1",
  },
  capture_provenance_verified: {
    claim_type: "capture_provenance_verified",
    assertion_class: "capture",
    establishes: "Capture-time provenance evidence supports the stated capture method.",
    does_not_establish: [
      "human_created_verified",
      "identity_verified",
      "rights_holder_verified",
      "ai_assistance_disclosed",
    ],
    minimum_evidence: "Future optional capture manifest or adapter evidence — not implemented in v1 foundation.",
    typical_assurance: "L2",
  },
};

/** Labels that must never appear as canonical decision results without matching evidence. */
export const FORBIDDEN_OVERSTATED_RESULTS = [
  "human_verified",
  "human_created_verified",
  "ai_generated_true",
  "kyc_complete",
  "identity_verified",
  "rights_verified",
  "government_verified",
] as const;

export function claimSemanticsFor(type: string): ProvenanceClaimSemantics | null {
  if (type in PROVENANCE_CLAIM_SEMANTICS) {
    return PROVENANCE_CLAIM_SEMANTICS[type as ProvenanceClaimType];
  }
  return null;
}

export function isValidAiDisclosureCategory(value: unknown): value is AiAssistanceCategory {
  return value === "none_declared"
    || value === "editing_assistance"
    || value === "generative_assistance"
    || value === "substantially_generated";
}

export function assertClaimDoesNotOverstate(
  claimType: ProvenanceClaimType,
  proposedResultLabel: string,
): { ok: true } | { ok: false; reason: string } {
  const semantics = PROVENANCE_CLAIM_SEMANTICS[claimType];
  const normalized = proposedResultLabel.trim().toLowerCase();
  for (const forbidden of semantics.does_not_establish) {
    if (normalized.includes(forbidden.replace(/_/g, " ")) || normalized === forbidden) {
      return { ok: false, reason: `result_overstates_${claimType}` };
    }
  }
  for (const forbidden of FORBIDDEN_OVERSTATED_RESULTS) {
    if (normalized === forbidden || normalized.includes(forbidden.replace(/_/g, " "))) {
      return { ok: false, reason: "forbidden_overstated_result" };
    }
  }
  return { ok: true };
}
