// FILE: lib/developers/ephemeralWorkspaceUserErrors.ts

export type WorkspaceUserFacingError = {
  title: string;
  message: string;
  recovery?: string;
  technicalCode?: string;
  correlationId?: string | null;
};

export function mapWorkspaceUserFacingError(input: {
  code?: string | null;
  correlationId?: string | null;
}): WorkspaceUserFacingError {
  const code = input.code?.trim() || null;
  switch (code) {
    case "wallet_sign_in_required":
      return {
        title: "Session expired",
        message: "Connect your wallet to continue.",
        recovery: "Use Connect wallet in the header or below.",
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
      return {
        title: "Additional evidence required",
        message: "Age verification requires a credential from a supported issuer.",
        recovery: "Choose Wallet Control to complete a supported test verification.",
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
