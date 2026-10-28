// FILE: lib/home/trustArchitectureStages.ts
// Four-stage public architecture narrative (homepage diagram, Build 884).

export type TrustArchitectureStageId = "request" | "decision" | "verification" | "action";

export type TrustArchitectureStage = {
  id: TrustArchitectureStageId;
  index: string;
  title: string;
  summary: string;
  continuity: string;
  panelPoints: readonly string[];
  visualSrc: string;
  visualAlt: string;
  visualWidth: number;
  visualHeight: number;
};

export const TRUST_ARCHITECTURE_OVERVIEW = {
  src: "/home/abraxas-architecture-overview-complete.png",
  alt: "Complete Abraxas architecture overview: request, Abraxas decision, independent verification, and application enforcement with continuity.",
  width: 2400,
  height: 1350,
} as const;

/** Shared stage frame dimensions — prevents layout shift between stages. */
export const TRUST_ARCHITECTURE_STAGE_FRAME = {
  width: 1200,
  height: 1600,
} as const;

export const TRUST_ARCHITECTURE_STAGES: TrustArchitectureStage[] = [
  {
    id: "request",
    index: "01",
    title: "Request",
    summary: "An application asks whether a specific action should be allowed under a defined policy.",
    panelPoints: ["Actor", "Action", "Authoritative evidence requirement", "Policy"],
    continuity: "The request stays bound to the policy and audience from the start.",
    visualSrc: "/home/abraxas-architecture-stage-01-request.png",
    visualAlt: "Stage 01 Request: actor, action, evidence, and policy before evaluation.",
    visualWidth: TRUST_ARCHITECTURE_STAGE_FRAME.width,
    visualHeight: TRUST_ARCHITECTURE_STAGE_FRAME.height,
  },
  {
    id: "decision",
    index: "02",
    title: "Abraxas decision",
    summary:
      "Abraxas issues a signed decision only after evidence integrity, issuer authority, policy evaluation, and current validity are satisfied.",
    panelPoints: [
      "Evidence integrity",
      "Issuer and delegated authority",
      "Policy evaluation",
      "Current validity",
      "Signed decision",
    ],
    continuity: "A valid signature proves authenticity—not that authorization remains current without status checks.",
    visualSrc: "/home/abraxas-architecture-stage-02-decision.png",
    visualAlt: "Stage 02 Abraxas decision: evidence, authority, policy, validity, signed decision receipt.",
    visualWidth: TRUST_ARCHITECTURE_STAGE_FRAME.width,
    visualHeight: TRUST_ARCHITECTURE_STAGE_FRAME.height,
  },
  {
    id: "verification",
    index: "03",
    title: "Independent verification",
    summary: "A relying party verifies the result without trusting Abraxas UI or databases at enforcement time.",
    panelPoints: [
      "Trusted issuer",
      "Cryptographic signature",
      "Evidence integrity",
      "Policy and audience binding",
      "Freshness and revocation",
    ],
    continuity: "Verification fails closed when signed status is stale or revoked—checked at defined enforcement points.",
    visualSrc: "/home/abraxas-architecture-stage-03-verification.png",
    visualAlt: "Stage 03 Independent verification: trust anchor, signatures, binding, signed status.",
    visualWidth: TRUST_ARCHITECTURE_STAGE_FRAME.width,
    visualHeight: TRUST_ARCHITECTURE_STAGE_FRAME.height,
  },
  {
    id: "action",
    index: "04",
    title: "Application action",
    summary: "Your application enforces permit, deny, or indeterminate from the independently verified result.",
    panelPoints: ["Permit", "Deny", "Indeterminate", "Integrating application enforces the outcome"],
    continuity:
      "Reevaluation is a continuity operation when evidence, authority, or status changes—not a fourth authorization outcome.",
    visualSrc: "/home/abraxas-architecture-stage-04-action.png",
    visualAlt: "Stage 04 Application action: permit, deny, indeterminate enforcement by your system.",
    visualWidth: TRUST_ARCHITECTURE_STAGE_FRAME.width,
    visualHeight: TRUST_ARCHITECTURE_STAGE_FRAME.height,
  },
] as const;

export function trustArchitectureStageById(id: TrustArchitectureStageId): TrustArchitectureStage {
  return TRUST_ARCHITECTURE_STAGES.find((s) => s.id === id) ?? TRUST_ARCHITECTURE_STAGES[0]!;
}
