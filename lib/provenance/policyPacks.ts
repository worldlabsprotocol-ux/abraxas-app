// FILE: lib/provenance/policyPacks.ts
// Minimal provenance policy packs — expressed through existing Abraxas policy architecture.

import type { PolicyPack, PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import type { ProvenanceClaimType, ProvenancePolicyQuestion } from "./types";

export const PROVENANCE_POLICY_PACK_IDS = [
  "content_origin_disclosure",
  "content_ai_disclosure",
  "content_source_integrity",
] as const;

export type ProvenancePolicyPackId = (typeof PROVENANCE_POLICY_PACK_IDS)[number];

export const PROVENANCE_POLICY_QUESTIONS: Record<ProvenancePolicyPackId, ProvenancePolicyQuestion> = {
  content_origin_disclosure: {
    pack_id: "content_origin_disclosure",
    question: "Does this artifact meet origin disclosure requirements (creator attestation, AI disclosure, and fingerprint integrity)?",
    required_claim: "creator_attested",
    disclosed_result: "content_origin_disclosed",
    minimum_assurance: "L1",
  },
  content_ai_disclosure: {
    pack_id: "content_ai_disclosure",
    question: "Has the creator disclosed whether generative AI materially contributed to this artifact?",
    required_claim: "ai_assistance_disclosed",
    disclosed_result: "ai_assistance_disclosed",
    minimum_assurance: "L0",
  },
  content_source_integrity: {
    pack_id: "content_source_integrity",
    question: "Does this submitted artifact match the previously established fingerprint?",
    required_claim: "source_integrity_verified",
    disclosed_result: "source_integrity_verified",
    minimum_assurance: "L1",
  },
};

export function isProvenancePolicyPackId(value: string): value is ProvenancePolicyPackId {
  return (PROVENANCE_POLICY_PACK_IDS as readonly string[]).includes(value);
}

export function resolveProvenancePolicyPack(packId: string): ProvenancePolicyQuestion | null {
  if (!isProvenancePolicyPackId(packId)) return null;
  return PROVENANCE_POLICY_QUESTIONS[packId];
}

export function resolveCatalogPolicyPack(packId: string): PolicyPack | null {
  if (!isProvenancePolicyPackId(packId)) return null;
  return POLICY_PACKS[packId as PolicyPackId] ?? null;
}

export function requiredProvenanceClaimForPack(packId: string): ProvenanceClaimType | null {
  return resolveProvenancePolicyPack(packId)?.required_claim ?? null;
}
