// Presentation-only stages for holder wallet-control journey (not API state).

export type HolderPresentationStageId =
  | "review"
  | "wallet"
  | "authorization"
  | "decision"
  | "outcome";

export const HOLDER_PRESENTATION_STAGE_ORDER: HolderPresentationStageId[] = [
  "review",
  "wallet",
  "authorization",
  "decision",
  "outcome",
];

export const HOLDER_PRESENTATION_STAGE_LABELS: Record<HolderPresentationStageId, string> = {
  review: "Review",
  wallet: "Wallet",
  authorization: "Authorization",
  decision: "Decision",
  outcome: "Outcome",
};

export function resolveWalletControlPresentationStage(input: {
  methodQualified: boolean;
  showConsent: boolean;
  flowComplete: boolean;
}): HolderPresentationStageId {
  if (input.flowComplete) return "outcome";
  if (input.showConsent) return "decision";
  if (input.methodQualified) return "authorization";
  return "wallet";
}

export function holderPresentationStageStatus(
  stage: HolderPresentationStageId,
  active: HolderPresentationStageId,
): "complete" | "current" | "pending" {
  const activeIdx = HOLDER_PRESENTATION_STAGE_ORDER.indexOf(active);
  const idx = HOLDER_PRESENTATION_STAGE_ORDER.indexOf(stage);
  if (idx < activeIdx) return "complete";
  if (idx === activeIdx) return "current";
  return "pending";
}

export function mapPartnerVerifyPhaseToPresentationStage(
  phase: string,
): HolderPresentationStageId {
  switch (phase) {
    case "approved":
    case "denied":
    case "return_failed":
    case "error":
    case "expired":
    case "cancelled":
    case "missing":
    case "invalid_link":
    case "invalid_binding":
    case "method_not_qualified":
    case "provider_unavailable":
    case "pending_review":
      return "outcome";
    case "sign_in":
    case "signing_in":
      return "wallet";
    case "bootstrapping":
    case "preparing":
    case "verifying":
    case "returning":
    case "loading":
      return "authorization";
    default:
      return "review";
  }
}
