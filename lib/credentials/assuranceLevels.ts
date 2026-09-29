// FILE: lib/credentials/assuranceLevels.ts
// Machine-readable L0–L4 assurance ladder for policy and reuse trust checks.

import type { AssuranceLevel } from "./claimSchema";

export const ASSURANCE_LEVELS: readonly AssuranceLevel[] = ["L0", "L1", "L2", "L3", "L4"];

export interface AssuranceLevelDefinition {
  level: AssuranceLevel;
  rank: number;
  label: string;
  summary: string;
}

/** Ordered assurance ladder used across policy packs and reusable evidence trust. */
export const ASSURANCE_LEVEL_DEFINITIONS: readonly AssuranceLevelDefinition[] = [
  {
    level: "L0",
    rank: 0,
    label: "Browse / self-attested",
    summary: "Self-attestation or browse-only signals. Cannot satisfy authoritative production policies.",
  },
  {
    level: "L1",
    rank: 1,
    label: "Basic",
    summary: "Low-assurance binding or partner-configured checks without document-grade evidence.",
  },
  {
    level: "L2",
    rank: 2,
    label: "Document-backed",
    summary: "Identity or residency evidence backed by approved document or credential pipelines.",
  },
  {
    level: "L3",
    rank: 3,
    label: "Reviewed / verified",
    summary: "Stronger reviewed evidence such as government ID validation with liveness where required.",
  },
  {
    level: "L4",
    rank: 4,
    label: "Highest reviewed",
    summary: "Highest configured assurance tier for policies that explicitly require it.",
  },
];

const RANK: Record<AssuranceLevel, number> = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
};

export function assuranceRank(level: string | null | undefined): number | null {
  if (!level || !(level in RANK)) return null;
  return RANK[level as AssuranceLevel];
}

export function assuranceMeetsMinimum(
  observed: string | null | undefined,
  required: string | null | undefined,
): boolean {
  const left = assuranceRank(observed);
  const right = assuranceRank(required);
  if (left == null || right == null) return false;
  return left >= right;
}

export function assuranceDowngradeBlocked(
  observed: string | null | undefined,
  required: string | null | undefined,
): boolean {
  return !assuranceMeetsMinimum(observed, required);
}
