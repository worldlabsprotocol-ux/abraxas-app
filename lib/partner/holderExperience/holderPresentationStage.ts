// Presentation-only stages for holder wallet-control journey (not API state).

/** Internal states — security boundaries stay separate. */
export type HolderPresentationStageId =
  | "review"
  | "wallet"
  | "authorization"
  | "decision"
  | "outcome";

/** User-visible progression (four steps, not five onboarding procedures). */
export type HolderPublicStepId = "review" | "verify_wallet" | "approve" | "complete";

export const HOLDER_PUBLIC_STEP_ORDER: HolderPublicStepId[] = [
  "review",
  "verify_wallet",
  "approve",
  "complete",
];

export const HOLDER_PUBLIC_STEP_LABELS: Record<HolderPublicStepId, string> = {
  review: "Review",
  verify_wallet: "Verify wallet",
  approve: "Approve",
  complete: "Complete",
};

export function mapInternalStageToPublicStep(
  internal: HolderPresentationStageId,
): HolderPublicStepId {
  switch (internal) {
    case "review":
      return "review";
    case "wallet":
      return "verify_wallet";
    case "authorization":
    case "decision":
      return "approve";
    case "outcome":
      return "complete";
    default:
      return "review";
  }
}

export function resolveWalletControlPresentationStage(input: {
  reviewAcknowledged: boolean;
  methodQualified: boolean;
  showConsent: boolean;
  flowComplete: boolean;
}): HolderPresentationStageId {
  if (input.flowComplete) return "outcome";
  if (!input.reviewAcknowledged) return "review";
  if (input.showConsent) return "decision";
  if (input.methodQualified) return "authorization";
  return "wallet";
}

export function holderPublicStepStatus(
  step: HolderPublicStepId,
  activePublic: HolderPublicStepId,
): "complete" | "current" | "pending" {
  const activeIdx = HOLDER_PUBLIC_STEP_ORDER.indexOf(activePublic);
  const idx = HOLDER_PUBLIC_STEP_ORDER.indexOf(step);
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
