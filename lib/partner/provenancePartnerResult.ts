// FILE: lib/partner/provenancePartnerResult.ts
// Narrow provenance facts for partner verification results.

import type { PolicyEvaluationResult } from "@/lib/policy/types";
import {
  buildPartnerVerificationResult,
  sanitizePartnerPayload,
  type PartnerVerificationResult,
} from "@/lib/partner/partnerVerificationResult";

export interface ProvenancePartnerFacts {
  creator_attested: boolean;
  ai_assistance_disclosed: string;
  source_integrity_verified: boolean;
  assertion_classes: {
    creator_attested: "attestation";
    ai_assistance_disclosed: "disclosure";
    source_integrity_verified: "integrity";
  };
}

export type ProvenancePartnerVerificationResult = PartnerVerificationResult & {
  provenance?: ProvenancePartnerFacts;
};

export function extractProvenancePartnerFacts(
  evaluation: PolicyEvaluationResult,
): ProvenancePartnerFacts | null {
  if (evaluation.decision !== "approved") return null;
  const creator = evaluation.claims.creator_attested;
  const ai = evaluation.claims.ai_assistance_disclosed;
  const integrity = evaluation.claims.source_integrity_verified;
  if (creator !== true || integrity !== true || typeof ai !== "string" || !ai) {
    return null;
  }
  return {
    creator_attested: true,
    ai_assistance_disclosed: ai,
    source_integrity_verified: true,
    assertion_classes: {
      creator_attested: "attestation",
      ai_assistance_disclosed: "disclosure",
      source_integrity_verified: "integrity",
    },
  };
}

export function buildProvenancePartnerVerificationResult(input: {
  base: PartnerVerificationResult;
  evaluation: PolicyEvaluationResult;
}): ProvenancePartnerVerificationResult {
  const provenance = extractProvenancePartnerFacts(input.evaluation);
  return sanitizePartnerPayload({
    ...input.base,
    ...(provenance ? { provenance } : {}),
  });
}

export function buildProvenanceVerificationResultFromIssue(input: {
  decision: "approved" | "denied" | "manual_review";
  credentialJti: string;
  issuer: string;
  evaluatedAt: string;
  receiptId: string;
  receiptExpiresAt: string;
  policyId: string;
  partnerId: string;
  evaluation: PolicyEvaluationResult;
  reasonCodes?: string[];
}): ProvenancePartnerVerificationResult {
  const base = buildPartnerVerificationResult({
    decision: input.decision,
    credentialJti: input.credentialJti,
    issuer: input.issuer,
    evaluatedAt: input.evaluatedAt,
    receiptId: input.receiptId,
    receiptExpiresAt: input.receiptExpiresAt,
    policyId: input.policyId,
    partnerId: input.partnerId,
    identityVerified: false,
    assuranceLevel: "L0",
    reasonCodes: input.reasonCodes ?? input.evaluation.reason_codes,
  });
  return buildProvenancePartnerVerificationResult({ base, evaluation: input.evaluation });
}
