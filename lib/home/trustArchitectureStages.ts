// FILE: lib/home/trustArchitectureStages.ts
// Four-stage public architecture narrative (homepage diagram).

export type TrustArchitectureStageId = "request" | "decision" | "verification" | "action";

export type TrustArchitectureStage = {
  id: TrustArchitectureStageId;
  index: string;
  title: string;
  question: string;
  summary: string;
  continuity: string;
};

export const TRUST_ARCHITECTURE_STAGES: TrustArchitectureStage[] = [
  {
    id: "request",
    index: "01",
    title: "Request",
    question: "What action needs approval?",
    summary:
      "A user, application, or agent asks to perform an action that requires trust under a specific policy.",
    continuity: "The request binds to a policy version and audience before any decision is issued.",
  },
  {
    id: "decision",
    index: "02",
    title: "Abraxas decision",
    question: "Who has authority, and does the request satisfy the policy?",
    summary:
      "Abraxas evaluates authoritative evidence, issuer authority, and policy rules, then signs a scoped permit, deny, or indeterminate result.",
    continuity: "Authority scope, expiration, and issuer state are part of the signed decision material.",
  },
  {
    id: "verification",
    index: "03",
    title: "Independent verification",
    question: "Can another application verify the signed result and its current validity?",
    summary:
      "A relying party checks signatures, policy binding, and signed status evidence without trusting Abraxas UI.",
    continuity: "Revocation, supersession, and stale status evidence fail closed—prior signatures are not enough alone.",
  },
  {
    id: "action",
    index: "04",
    title: "Application action",
    question: "Does the application permit, deny, or withhold authorization?",
    summary:
      "Your system enforces the verified outcome in custody workflows, treasury rules, or product gates—Abraxas does not replace that enforcement.",
    continuity: "Reevaluate when policies change, mandates expire, or continuity checks require a fresh decision.",
  },
] as const;
