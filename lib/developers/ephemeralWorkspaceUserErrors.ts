// FILE: lib/developers/ephemeralWorkspaceUserErrors.ts

export type WorkspaceUserFacingError = {
  title: string;
  message: string;
  recovery?: string;
  technicalCode?: string;
  correlationId?: string | null;
};

export function mapEphemeralWalletOperationalError(input: {
  degradedReason?: string | null;
  configCode?: string | null;
}): WorkspaceUserFacingError {
  const reason = input.degradedReason?.trim() || input.configCode?.trim() || null;
  switch (reason) {
    case "distributed_replay_not_configured":
      return {
        title: "Wallet sandbox unavailable here",
        message:
          "This deployment requires shared security storage for single-use wallet authorization. Configure Upstash Redis for Preview, or use local development with the same Redis-backed setup.",
        recovery: "See docs/connect/EPHEMERAL_WALLET_AUTH.md for required variables.",
        technicalCode: reason,
      };
    case "session_secret_missing":
      return {
        title: "Wallet sandbox not configured",
        message: "Session signing is not configured in this environment.",
        recovery: "Set a 32+ character session secret for ephemeral wallet auth.",
        technicalCode: reason,
      };
    case "ephemeral_state_unavailable":
    case "ephemeral_state_not_configured":
      return {
        title: "Sandbox temporarily unavailable",
        message: "Security storage for this workspace is not reachable.",
        recovery: "Retry shortly or switch to an environment with Redis configured.",
        technicalCode: reason,
      };
    case "disabled":
      return {
        title: "Wallet sandbox disabled",
        message: "Ephemeral wallet authentication is not enabled in this environment.",
        technicalCode: reason,
      };
    default:
      return {
        title: "Wallet sandbox unavailable",
        message: "This environment cannot run the developer workspace flow right now.",
        recovery: reason ? undefined : "Try again or contact your operator.",
        technicalCode: reason ?? undefined,
      };
  }
}

export function mapWorkspaceUserFacingError(input: {
  code?: string | null;
  correlationId?: string | null;
}): WorkspaceUserFacingError {
  const code = input.code?.trim() || null;
  switch (code) {
    case "wallet_sign_in_required":
      return {
        title: "Sign-in required",
        message: "Your Abraxas session ended. Connect your wallet and sign in to continue.",
        recovery: "Use Sign in in the header or below.",
        technicalCode: code,
        correlationId: input.correlationId,
      };
    case "insufficient_scope":
      return {
        title: "Session not authorized",
        message: "Your wallet session cannot open this workspace. Sign in again.",
        technicalCode: code,
        correlationId: input.correlationId,
      };
    case "ephemeral_state_unavailable":
    case "store_unavailable":
      return {
        title: "Sandbox temporarily unavailable",
        message: "Security storage is unavailable. Try again in a moment.",
        technicalCode: code,
        correlationId: input.correlationId,
      };
    case "insufficient_evidence_for_policy":
    case "unsupported_evidence":
    case "credential_evidence_required":
      return {
        title: "Evidence required",
        message: "Prepare issuer evidence before authorizing this policy test.",
        recovery: "Use Prepare presentation for Age 21 test, or choose Wallet Control.",
        technicalCode: code,
        correlationId: input.correlationId,
      };
    case "presentation_commit_required":
    case "presentation_commit_not_found":
    case "presentation_commit_expired":
      return {
        title: "Presentation expired",
        message: "Prepare the credential presentation again before signing.",
        recovery: "Return to the policy card and run Prepare presentation.",
        technicalCode: code,
        correlationId: input.correlationId,
      };
    case "presentation_evidence_mismatch":
    case "presentation_policy_mismatch":
    case "presentation_wallet_mismatch":
    case "presentation_session_mismatch":
      return {
        title: "Presentation binding failed",
        message: "The submitted credential does not match the presentation you approved.",
        recovery: "Prepare presentation again and authorize without changing the evidence.",
        technicalCode: code,
        correlationId: input.correlationId,
      };
    case "session_context_mismatch":
      return {
        title: "Session context expired",
        message: "Start building again to refresh your workspace authorization context.",
        technicalCode: code,
        correlationId: input.correlationId,
      };
    default:
      return {
        title: "Could not complete this step",
        message: "Try again. If the problem continues, sign out and connect your wallet again.",
        technicalCode: code ?? undefined,
        correlationId: input.correlationId,
      };
  }
}
