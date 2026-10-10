// Canonical holder-facing Passport step — single next action (Build #511).

import type { PassportSetupState } from "@/lib/idv/identityVerificationStates";
import type { IdentityStampStatus } from "@/lib/hooks/usePassportVerification";
import { resolveIdentityUiState, IDENTITY_UI_LABELS, type IdentityUiState } from "@/lib/passport/identityUiState";

export type PassportJourneyStepId =
  | "sign_in"
  | "secure_account"
  | "start_verification"
  | "continue_verification"
  | "under_review"
  | "verified_reuse"
  | "needs_attention"
  | "partner_return";

export interface PassportHolderJourneyStatus {
  stepId: PassportJourneyStepId;
  stateLabel: string;
  headline: string;
  nextAction: string;
  progressSafe: boolean;
  identityUi: IdentityUiState;
}

export function resolvePassportHolderJourneyStatus(input: {
  walletDone: boolean;
  setup: PassportSetupState;
  identityStatus: IdentityStampStatus;
  hasCredential: boolean;
  idvProvider: "veriff" | "manual";
  via: string | null;
  partnerFlowActive?: boolean;
  startingVerification?: boolean;
}): PassportHolderJourneyStatus {
  const identityUi = resolveIdentityUiState({
    identityStatus: input.identityStatus,
    hasCredential: input.hasCredential,
    idvProvider: input.idvProvider,
    via: input.via,
  });

  if (!input.walletDone) {
    return {
      stepId: "sign_in",
      stateLabel: "Sign in",
      headline: "Connect your wallet to open your Passport",
      nextAction: "Sign in with Phantom to continue. Your progress saves to this wallet.",
      progressSafe: true,
      identityUi,
    };
  }

  if (!input.setup.walletBound) {
    return {
      stepId: "secure_account",
      stateLabel: "Secure account",
      headline: "Confirm wallet control",
      nextAction: "Complete the one-time security step so partners can trust this Passport.",
      progressSafe: true,
      identityUi,
    };
  }

  if (input.partnerFlowActive && identityUi === "verified" && input.hasCredential) {
    return {
      stepId: "partner_return",
      stateLabel: IDENTITY_UI_LABELS.verified,
      headline: "Return to your request",
      nextAction: "Your verification can be reused. Continue to review consent and finish with the partner.",
      progressSafe: true,
      identityUi,
    };
  }

  if (identityUi === "verified" && input.hasCredential) {
    return {
      stepId: "verified_reuse",
      stateLabel: IDENTITY_UI_LABELS.verified,
      headline: "Verified — ready to reuse",
      nextAction: "When a partner asks, you review consent and share only the narrow eligibility result.",
      progressSafe: true,
      identityUi,
    };
  }

  if (identityUi === "under_review") {
    return {
      stepId: "under_review",
      stateLabel: IDENTITY_UI_LABELS.under_review,
      headline: "Verification under review",
      nextAction: "No action needed right now. We'll update your Passport when review completes. You can safely leave and return.",
      progressSafe: true,
      identityUi,
    };
  }

  if (identityUi === "needs_action") {
    return {
      stepId: "needs_attention",
      stateLabel: IDENTITY_UI_LABELS.needs_action,
      headline: "Verification needs attention",
      nextAction: "Open verification to fix the issue noted in your Passport. Only required steps will be asked.",
      progressSafe: true,
      identityUi,
    };
  }

  if (input.identityStatus === "pending" || input.startingVerification) {
    return {
      stepId: "continue_verification",
      stateLabel: "In progress",
      headline: "Continue verification",
      nextAction: "Finish capturing or uploading documents. If the window closed, tap Start verification again.",
      progressSafe: true,
      identityUi,
    };
  }

  return {
    stepId: "start_verification",
    stateLabel: IDENTITY_UI_LABELS.not_started,
    headline: "Add verified information",
    nextAction: "Start verification once. Later partner requests can reuse it when policy allows.",
    progressSafe: true,
    identityUi,
  };
}
