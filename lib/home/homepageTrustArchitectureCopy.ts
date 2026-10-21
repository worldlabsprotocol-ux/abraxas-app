// FILE: lib/home/homepageTrustArchitectureCopy.ts
// Founder-approved homepage trust architecture copy (#771–774 accurate).

export const HOMEPAGE_WHAT_HEADING = "What Abraxas does";
export const HOMEPAGE_WHAT_LEAD =
  "Abraxas turns complex verification into one clean trust transaction.";

export type ProtocolFlowStageId =
  | "application"
  | "holder_authorization"
  | "issuer_evidence"
  | "policy_evaluation"
  | "signed_decision"
  | "independent_verification";

export type ProtocolFlowStage = {
  id: ProtocolFlowStageId;
  title: string;
  summary: string;
};

export const HOMEPAGE_PROTOCOL_FLOW_STAGES: ProtocolFlowStage[] = [
  {
    id: "application",
    title: "Application",
    summary: "A relying party requests a specific policy outcome for one action—not open-ended identity access.",
  },
  {
    id: "holder_authorization",
    title: "Holder authorization",
    summary: "The holder reviews scope, connects evidence when needed, and approves what may be evaluated or disclosed.",
  },
  {
    id: "issuer_evidence",
    title: "Issuer evidence",
    summary:
      "When the policy requires it, issuer-backed credentials or fresh checks supply evidence. Wallet-control policies use cryptographic wallet proof instead of an identity issuer.",
  },
  {
    id: "policy_evaluation",
    title: "Policy evaluation",
    summary: "Abraxas evaluates the live request against partner policy, freshness, binding, and revocation rules.",
  },
  {
    id: "signed_decision",
    title: "Signed decision",
    summary: "The holder receives a signed permit, deny, or review outcome scoped to the request— not raw personal data.",
  },
  {
    id: "independent_verification",
    title: "Independent verification",
    summary:
      "Relying parties verify supported receipt signatures, policy binding, and revocation where configured—not merely the Abraxas UI.",
  },
];

export const HOMEPAGE_WHAT_PRINCIPLES = [
  {
    emphasis: "user",
    text: "controls the evidence.",
  },
  {
    emphasis: "institution",
    text: "receives a decision, not a pile of personal data.",
  },
  {
    emphasis: "relying party",
    text: "can verify the result separately from the interface.",
  },
] as const;

export const HOMEPAGE_WHAT_CLOSER = "Verify what matters.";
export const HOMEPAGE_WHAT_CLOSER_ACCENT = "Reveal nothing else.";

export const HOMEPAGE_DEFENSIBLE_HEADING = "Why it is defensible";
export const HOMEPAGE_DEFENSIBLE_LEAD = "Abraxas is not another trust-us API. It is ";
export const HOMEPAGE_DEFENSIBLE_LEAD_ACCENT = "verifiable infrastructure.";

export const HOMEPAGE_DEFENSIBLE_PANELS = [
  {
    id: "wallet_native",
    title: "Wallet-native control",
    body:
      "Scoped signatures and holder-controlled authorization. No unnecessary permanent account requirement for wallet-control verification.",
  },
  {
    id: "evidence_based",
    title: "Evidence-based verification",
    body:
      "Policy-bound evidence, issuer-backed credentials where applicable, freshness checks, and revocation handling.",
  },
  {
    id: "independent_verify",
    title: "Independent verification",
    body:
      "A relying party can check supported cryptographic evidence or receipt integrity separately from the holder browser session and UI.",
  },
] as const;

export const HOMEPAGE_DEFENSIBLE_CLOSER = "Cryptographic authenticity, policy enforcement, and human clarity ";
export const HOMEPAGE_DEFENSIBLE_CLOSER_ACCENT = "in one workflow.";
