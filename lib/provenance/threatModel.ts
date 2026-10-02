// FILE: lib/provenance/threatModel.ts
// What Abraxas content provenance can and cannot truthfully prove.

export interface ProvenanceThreat {
  id: string;
  description: string;
  mitigated_by: string[];
  not_solved_by: string[];
}

export const PROVENANCE_THREAT_MODEL: ProvenanceThreat[] = [
  {
    id: "false_creator_attestation",
    description: "Creator falsely attests authorship of copied content.",
    mitigated_by: [
      "Separate creator_attested from source_integrity_verified",
      "Assurance labels distinguish attestation from verification",
      "Partners receive narrow policy result, not implied human verification",
    ],
    not_solved_by: [
      "L0 creator attestation alone",
      "Probabilistic AI detection",
    ],
  },
  {
    id: "artifact_mutation_after_binding",
    description: "Artifact changed after provenance establishment.",
    mitigated_by: [
      "source_integrity_verified requires hash match at evaluation",
      "Altered bytes fail integrity evaluation",
      "parent_artifact_id schema boundary for lineage (future)",
    ],
    not_solved_by: [
      "Single hash without re-evaluation",
      "Creator attestation without fingerprint binding",
    ],
  },
  {
    id: "hash_substitution",
    description: "Attacker binds provenance to a different artifact hash.",
    mitigated_by: [
      "Evaluation compares submitted hash to stored binding",
      "Receipt remains partner-bound and policy-specific",
    ],
    not_solved_by: [
      "Client-supplied hash without server-side binding record",
    ],
  },
  {
    id: "identity_conflated_with_authorship",
    description: "Identity verification interpreted as authorship or human-origin proof.",
    mitigated_by: [
      "Separate claim types and assertion classes",
      "Forbidden overstated result labels",
      "Selective disclosure withholds identity from provenance partners by default",
    ],
    not_solved_by: [
      "Stronger identity verification alone",
    ],
  },
  {
    id: "disclosure_conflated_with_detection",
    description: "Creator AI disclosure treated as AI detection result.",
    mitigated_by: [
      "ai_assistance_disclosed is disclosure class only",
      "External detector outputs must use adapter boundary (future)",
      "No probabilistic scores in canonical claims",
    ],
    not_solved_by: [
      "Self-reported disclosure",
    ],
  },
  {
    id: "excessive_partner_disclosure",
    description: "Partner receives raw artifact, identity, or unrelated Passport data.",
    mitigated_by: [
      "Selective disclosure profiles per provenance pack",
      "Receipt contains claim refs only — no raw claim_value",
      "Forbidden classes include raw_evidence",
    ],
    not_solved_by: [
      "Policy evaluation alone without disclosure enforcement",
    ],
  },
];

export const PROVENANCE_NON_GOALS = [
  "Universal human-created verification",
  "Probabilistic AI-generated detection as canonical truth",
  "Plagiarism or copyright enforcement",
  "Mandatory blockchain, C2PA, or wallet integration",
  "Permanent storage of raw copyrighted media in Abraxas",
] as const;
