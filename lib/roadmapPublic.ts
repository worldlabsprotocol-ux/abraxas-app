// FILE: lib/roadmapPublic.ts
// Public roadmap — evidence-backed status (see docs/INTEGRATION_READINESS_RECONCILIATION.md).

import {
  INTEGRATION_STATUS_SECTIONS,
  isLiveIntegrationPhase,
  type IntegrationStatusId,
} from "@/lib/integrationReadiness";

export type RoadmapSectionId = IntegrationStatusId;

export interface RoadmapSection {
  id: RoadmapSectionId;
  phase: string;
  emoji: string;
  color: string;
  description: string;
  items: readonly string[];
}

export const ROADMAP_HEADLINE = "Integration & protocol status";

export const ROADMAP_SUBTITLE =
  "What is live on abraxasworld.xyz today, what awaits pilot evidence, and which release gates remain open. Reconciled against merged PRs — not marketing promises.";

export const ROADMAP_NARRATIVE = [
  "We built zkLogin Passport, biometrics, the Trust Engine, and Partner Flow APIs on abraxasworld.xyz.",
  "P1-2 (validity + idempotency) and P1-3 (audit traceability) merged to main with operator tooling.",
  "Good Trouble is the reference pilot checkout — sandbox/pilot until operator evidence says otherwise.",
  "IAT, external security review, and v1.0.0-beta.0 remain open gates before GA claims.",
] as const;

export const ROADMAP_SECTIONS: readonly RoadmapSection[] = INTEGRATION_STATUS_SECTIONS;

export const ROADMAP_LONG_TERM_VISION = {
  title: "Long-term vision",
  body:
    "These directions inform category positioning — they are not current commitments. Work expands after beta gates and a second relying party clear production.",
  items: [
    "Open mainnet deployment",
    "Token utility & governance",
    "Marketplace & liquidity infrastructure",
    "DAO coordination layer",
  ],
} as const;

/** Shape expected by MilestonesSection and legacy consumers. */
export const ROADMAP = ROADMAP_SECTIONS.map(section => ({
  phase: section.phase,
  color: section.color,
  items: section.items,
})) as readonly { phase: string; color: string; items: readonly string[] }[];

export function isCompletedRoadmapPhase(phase: string): boolean {
  return isLiveIntegrationPhase(phase);
}
