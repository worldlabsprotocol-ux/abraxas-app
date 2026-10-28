// FILE: lib/home/trustArchitectureStages.ts
// Four-stage public architecture narrative (homepage diagram, Build 886A).

export type TrustArchitectureStageId = "request" | "decision" | "verification" | "action";

export type TrustArchitectureStage = {
  id: TrustArchitectureStageId;
  index: string;
  title: string;
  /** One plain language sentence shown under the stage tabs. */
  caption: string;
  visualSrc: string;
  visualAlt: string;
  visualWidth: number;
  visualHeight: number;
};

export const TRUST_ARCHITECTURE_SECTION_LEAD =
  "Trust decisions use evidence, authority, and continuity at every step. Wallet possession alone is not enough.";

export const TRUST_ARCHITECTURE_OVERVIEW = {
  src: "/home/abraxas-architecture-overview-complete.png",
  alt: "Complete Abraxas architecture overview from request through application enforcement.",
  width: 2400,
  height: 1350,
} as const;

export const TRUST_ARCHITECTURE_STAGE_FRAME = {
  width: 1200,
  height: 1600,
} as const;

export const TRUST_ARCHITECTURE_STAGES: TrustArchitectureStage[] = [
  {
    id: "request",
    index: "01",
    title: "Request",
    caption: "A request is made for a specific action.",
    visualSrc: "/home/abraxas-architecture-stage-01-request.png",
    visualAlt: "Stage 01 Request: your application asks whether an action should be allowed.",
    visualWidth: TRUST_ARCHITECTURE_STAGE_FRAME.width,
    visualHeight: TRUST_ARCHITECTURE_STAGE_FRAME.height,
  },
  {
    id: "decision",
    index: "02",
    title: "Abraxas decision",
    caption: "Abraxas checks the evidence and signs a decision.",
    visualSrc: "/home/abraxas-architecture-stage-02-decision.png",
    visualAlt: "Stage 02 Abraxas decision: evidence, authority, and policy checks before signing.",
    visualWidth: TRUST_ARCHITECTURE_STAGE_FRAME.width,
    visualHeight: TRUST_ARCHITECTURE_STAGE_FRAME.height,
  },
  {
    id: "verification",
    index: "03",
    title: "Independent verification",
    caption: "Anyone can verify the result independently.",
    visualSrc: "/home/abraxas-architecture-stage-03-verification.png",
    visualAlt: "Stage 03 Independent verification: signatures and status checked without trusting Abraxas UI.",
    visualWidth: TRUST_ARCHITECTURE_STAGE_FRAME.width,
    visualHeight: TRUST_ARCHITECTURE_STAGE_FRAME.height,
  },
  {
    id: "action",
    index: "04",
    title: "Application action",
    caption: "The application uses the verified result to allow, deny, or ask for more review.",
    visualSrc: "/home/abraxas-architecture-stage-04-action.png",
    visualAlt: "Stage 04 Application action: your system enforces the verified outcome.",
    visualWidth: TRUST_ARCHITECTURE_STAGE_FRAME.width,
    visualHeight: TRUST_ARCHITECTURE_STAGE_FRAME.height,
  },
] as const;

export function trustArchitectureStageById(id: TrustArchitectureStageId): TrustArchitectureStage {
  return TRUST_ARCHITECTURE_STAGES.find((s) => s.id === id) ?? TRUST_ARCHITECTURE_STAGES[0]!;
}

/** Public homepage architecture copy must not use hyphen, en dash, or em dash. */
export function collectTrustArchitecturePublicCopy(): string[] {
  return [
    TRUST_ARCHITECTURE_SECTION_LEAD,
    ...TRUST_ARCHITECTURE_STAGES.flatMap((s) => [s.caption, s.title, s.visualAlt]),
    TRUST_ARCHITECTURE_OVERVIEW.alt,
  ];
}
