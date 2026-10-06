// FILE: lib/custody/zkBoundary.ts
// Future zero-knowledge / selective-disclosure adapter boundary.

export const ZK_ADAPTER_VERSION = "1.0.0" as const;
export const ZK_IMPLEMENTATION_STATUS = "boundary_only" as const;

export interface PredicateProofRequest {
  predicate: string;
  policyId: string;
  policyVersion: number;
  holderRef: string;
  evidenceRef?: string;
}

export interface PredicateProofResult {
  satisfied: boolean;
  proofSystem: string;
  proofRef: string;
  disclosedFacts: readonly string[];
  withheldClasses: readonly string[];
}

export interface ZkProofAdapter {
  readonly adapterId: string;
  readonly optional: true;
  supportsPredicate(predicate: string): boolean;
  generateProof(request: PredicateProofRequest): Promise<PredicateProofResult>;
  verifyProof(proofRef: string): Promise<{ ok: boolean; reason?: string }>;
}

export const ZK_BOUNDARY_EXAMPLES = [
  {
    evidence: "date_of_birth",
    predicate: "age >= 21",
    futureProof: "Prove DOB <= threshold without revealing DOB",
    currentPath: "deriveSelfAttestedAgeBand → age_band stored; L2 → product_eligibility over_21 claim",
  },
  {
    evidence: "identity_document",
    predicate: "identity_verified == true",
    futureProof: "Issuer-signed credential with selective disclosure",
    currentPath: "credential_claims with minimized claim_value",
  },
  {
    evidence: "content_artifact",
    predicate: "source_integrity_verified",
    futureProof: "Hash commitment + issuer attestation",
    currentPath: "content_artifact_records.content_hash only",
  },
] as const;

export const ZK_NON_GOALS = [
  "Homegrown zero-knowledge cryptography in core protocol",
  "Claiming ZK privacy when only allowlist redaction is enforced",
  "Mandatory proof system for all policies",
] as const;

export const noopZkAdapter: ZkProofAdapter = {
  adapterId: "noop",
  optional: true,
  supportsPredicate: () => false,
  async generateProof() {
    throw new Error("zk_adapter_not_configured");
  },
  async verifyProof() {
    return { ok: false, reason: "zk_adapter_not_configured" };
  },
};
