// FILE: lib/passport/passportEntryState.ts
// Explicit Passport entry and loading states for UI gating.

import type { PassportBrowserSessionState } from "@/lib/passport/passportBrowserSessionAuth";
import type { IdentityStatusFailureKind } from "@/lib/passport/identityStatusFetch";

export type PassportEntryPhase =
  | "checking_session"
  | "signed_out"
  | "session_expired"
  | "authenticated"
  | "loading_passport"
  | "passport_ready"
  | "recoverable_error"
  | "service_unavailable";

export function resolvePassportEntryPhase(input: {
  authLoading: boolean;
  walletDone: boolean;
  browserSessionState: PassportBrowserSessionState;
  pipelineLoading: boolean;
  pipelineErrorKind: IdentityStatusFailureKind | null;
  hasPipelineData: boolean;
}): PassportEntryPhase {
  if (input.authLoading) return "checking_session";
  if (!input.walletDone) return "signed_out";

  if (input.browserSessionState === "loading") return "checking_session";
  if (input.browserSessionState === "reauthentication_required") return "session_expired";
  if (input.browserSessionState === "session_probe_failed") return "recoverable_error";

  if (input.pipelineErrorKind === "service_unavailable") return "service_unavailable";
  if (input.pipelineErrorKind === "session_required") return "session_expired";
  if (input.pipelineErrorKind && input.pipelineErrorKind !== "forbidden") {
    return "recoverable_error";
  }

  if (input.pipelineLoading && !input.hasPipelineData) return "loading_passport";
  if (input.hasPipelineData) return "passport_ready";
  if (input.browserSessionState === "authenticated") return "loading_passport";

  return "authenticated";
}

export function shouldFetchProtectedPassportData(input: {
  walletDone: boolean;
  browserSessionState: PassportBrowserSessionState;
}): boolean {
  if (!input.walletDone) return false;
  if (input.browserSessionState !== "authenticated") return false;
  return true;
}

export function shouldShowPassportStatusOutageBanner(input: {
  phase: PassportEntryPhase;
  pipelineErrorKind: IdentityStatusFailureKind | null;
}): boolean {
  if (input.phase === "signed_out" || input.phase === "session_expired" || input.phase === "checking_session") {
    return false;
  }
  if (input.pipelineErrorKind === "session_required") return false;
  return input.phase === "recoverable_error" || input.phase === "service_unavailable";
}
