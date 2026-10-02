// FILE: lib/provenance/contentOriginDisclosure.ts
// Unified content-origin-disclosure-v1 evaluation — attestation, disclosure, integrity.

import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { PolicyEvaluationResult } from "@/lib/policy/types";
import { artifactFingerprintsMatch } from "./artifactFingerprint";
import { assertClaimDoesNotOverstate } from "./claimSemantics";
import type { AiAssistanceCategory, ContentArtifactBinding, ProvenanceClaimType } from "./types";
import { CONTENT_ORIGIN_DISCLOSURE_PACK_ID } from "./constants";

const REQUIRED_CLAIMS: ProvenanceClaimType[] = [
  "creator_attested",
  "ai_assistance_disclosed",
  "source_integrity_verified",
];

const UNSUPPORTED_CLAIMS: ProvenanceClaimType[] = ["capture_provenance_verified"];

function findActiveClaim(claims: CredentialClaimRecord[], claimType: string) {
  return claims.find((claim) => claim.claim_type === claimType && claim.status === "active");
}

function claimArtifactBinding(claim: CredentialClaimRecord): {
  artifactId: string | null;
  contentHash: string | null;
} {
  const artifactId = typeof claim.claim_value.artifact_id === "string"
    ? claim.claim_value.artifact_id
    : null;
  const contentHash = typeof claim.claim_value.content_hash === "string"
    ? claim.claim_value.content_hash
    : null;
  return { artifactId, contentHash };
}

function isValidContentHash(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

export interface ContentOriginDisclosureEvaluationInput {
  claims: CredentialClaimRecord[];
  submittedContentHash: string;
  artifactBinding?: ContentArtifactBinding | null;
  /** When the partner supplied an expected hash at request time, evaluation must match. */
  expectedContentHash?: string | null;
}

export function evaluateContentOriginDisclosure(
  input: ContentOriginDisclosureEvaluationInput,
): PolicyEvaluationResult {
  const decisionContext = "sandbox_only" as const;

  if (!isValidContentHash(input.submittedContentHash)) {
    return {
      decision: "denied",
      claims: {},
      reason_codes: ["artifact_hash_required"],
      valid_until: null,
      missing_claims: REQUIRED_CLAIMS,
      decision_context: decisionContext,
      production_usable: false,
    };
  }

  if (input.expectedContentHash && !artifactFingerprintsMatch(
    { content_hash: input.expectedContentHash },
    { content_hash: input.submittedContentHash },
  )) {
    return {
      decision: "denied",
      claims: {},
      reason_codes: ["partner_artifact_hash_mismatch"],
      valid_until: null,
      missing_claims: REQUIRED_CLAIMS,
      decision_context: decisionContext,
      production_usable: false,
    };
  }

  for (const unsupported of UNSUPPORTED_CLAIMS) {
    if (findActiveClaim(input.claims, unsupported)) {
      return {
        decision: "denied",
        claims: {},
        reason_codes: [`unsupported_provenance_claim:${unsupported}`],
        valid_until: null,
        missing_claims: REQUIRED_CLAIMS,
        decision_context: decisionContext,
        production_usable: false,
      };
    }
  }

  const matchedClaims: Partial<Record<ProvenanceClaimType, CredentialClaimRecord>> = {};
  const missing: string[] = [];

  for (const claimType of REQUIRED_CLAIMS) {
    const claim = findActiveClaim(input.claims, claimType);
    if (!claim) {
      missing.push(claimType);
      continue;
    }

    const overstated = assertClaimDoesNotOverstate(claimType, claimType);
    if (!overstated.ok) {
      return {
        decision: "denied",
        claims: {},
        reason_codes: [overstated.reason],
        valid_until: null,
        missing_claims: [claimType],
        decision_context: decisionContext,
        production_usable: false,
      };
    }

    const { artifactId, contentHash } = claimArtifactBinding(claim);
    if (!artifactId || !contentHash || !isValidContentHash(contentHash)) {
      missing.push(claimType);
      continue;
    }

    if (!artifactFingerprintsMatch(
      { content_hash: contentHash },
      { content_hash: input.submittedContentHash },
    )) {
      return {
        decision: "denied",
        claims: {},
        reason_codes: ["artifact_binding_mismatch"],
        valid_until: null,
        missing_claims: [claimType],
        decision_context: decisionContext,
        production_usable: false,
      };
    }

    matchedClaims[claimType] = claim;
  }

  if (missing.length > 0) {
    return {
      decision: "denied",
      claims: {},
      reason_codes: missing.map((claimType) => `missing:${claimType}`),
      valid_until: null,
      missing_claims: missing,
      decision_context: decisionContext,
      production_usable: false,
    };
  }

  const bindingHash = input.artifactBinding?.content_hash
    ?? claimArtifactBinding(matchedClaims.source_integrity_verified!).contentHash;

  if (!bindingHash || !artifactFingerprintsMatch(
    { content_hash: bindingHash },
    { content_hash: input.submittedContentHash },
  )) {
    return {
      decision: "denied",
      claims: {},
      reason_codes: ["source_integrity_mismatch"],
      valid_until: null,
      missing_claims: ["source_integrity_verified"],
      decision_context: decisionContext,
      production_usable: false,
    };
  }

  const artifactIds = REQUIRED_CLAIMS.map((claimType) =>
    claimArtifactBinding(matchedClaims[claimType]!).artifactId,
  );
  if (new Set(artifactIds).size !== 1) {
    return {
      decision: "denied",
      claims: {},
      reason_codes: ["artifact_binding_mismatch"],
      valid_until: null,
      missing_claims: REQUIRED_CLAIMS,
      decision_context: decisionContext,
      production_usable: false,
    };
  }

  const aiClaim = matchedClaims.ai_assistance_disclosed!;
  const category = aiClaim.claim_value.category;
  if (typeof category !== "string" || !category) {
    return {
      decision: "denied",
      claims: {},
      reason_codes: ["ai_disclosure_missing"],
      valid_until: null,
      missing_claims: ["ai_assistance_disclosed"],
      decision_context: decisionContext,
      production_usable: false,
    };
  }

  return {
    decision: "approved",
    claims: {
      policy_pack_id: CONTENT_ORIGIN_DISCLOSURE_PACK_ID,
      creator_attested: true,
      ai_assistance_disclosed: category as AiAssistanceCategory,
      source_integrity_verified: true,
      assertion_classes: {
        creator_attested: "attestation",
        ai_assistance_disclosed: "disclosure",
        source_integrity_verified: "integrity",
      },
    },
    reason_codes: [],
    valid_until: null,
    missing_claims: [],
    decision_context: decisionContext,
    production_usable: false,
  };
}
