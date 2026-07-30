// FILE: lib/roadmapPublic.ts
// Public roadmap — development log of shipped work, not a list of promises.

export type RoadmapSectionId = "completed" | "in_progress" | "future";

export interface RoadmapSection {
  id: RoadmapSectionId;
  phase: string;
  emoji: string;
  color: string;
  description: string;
  items: readonly string[];
}

export const ROADMAP_HEADLINE = "Protocol development log";

export const ROADMAP_SUBTITLE =
  "What we've shipped, what we're hardening now, and what's intentionally deferred. No calendar dates — only evidence-backed milestones.";

export const ROADMAP_NARRATIVE = [
  "We started by solving onboarding with zkLogin.",
  "We built Passport, identity verification, biometrics, and the Trust Engine.",
  "We hardened the protocol with P0 security fixes and a 383-test regression suite.",
  "We're now validating the protocol through institutional acceptance testing before expanding to additional relying parties.",
] as const;

export const ROADMAP_SECTIONS: readonly RoadmapSection[] = [
  {
    id: "completed",
    phase: "Completed",
    emoji: "✅",
    color: "#10B981",
    description: "Live in production or built and merged to main.",
    items: [
      "Google zkLogin onboarding",
      "Automatic wallet creation",
      "Abraxas Passport",
      "Identity verification pipeline",
      "Biometric verification",
      "Trust Engine",
      "Permission registry",
      "Trust Decision API",
      "Signed decision receipts",
      "Policy engine",
      "Partner SDK (Slice 1)",
      "Security hardening (P0 complete)",
      "Threat Model v1",
      "383+ automated regression tests",
      "~$2M in verified assets onboarded",
      "Good Trouble reference relying party flow",
    ],
  },
  {
    id: "in_progress",
    phase: "In progress",
    emoji: "🚧",
    color: "#F59E0B",
    description: "Active engineering gates with objective evidence requirements.",
    items: [
      "Institutional Acceptance Test (IAT)",
      "Protocol compatibility freeze",
      "Immutable policy versions (P1-1)",
      "Trust Decision validity (P1-2)",
      "Observability & audit improvements (P1-3)",
      "External security review",
      "v1.0.0-beta.0 baseline tag",
    ],
  },
  {
    id: "future",
    phase: "Future",
    emoji: "🔭",
    color: "#6366F1",
    description: "Intentionally short — expands after the protocol baseline is validated.",
    items: [
      "Additional relying party integrations",
      "Expanded issuer network",
      "Production-scale Trust Network",
      "Mainnet & tokenization expansion",
      "Broader RWA ecosystem integrations",
    ],
  },
] as const;

export const ROADMAP_LONG_TERM_VISION = {
  title: "Long-term vision",
  body:
    "These directions inform the protocol's category — they are not current engineering commitments. Work begins only after v1.0.0-beta hardening and external review.",
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
  return phase === "Completed";
}
