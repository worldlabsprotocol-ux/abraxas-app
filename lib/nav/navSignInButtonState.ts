// FILE: lib/nav/navSignInButtonState.ts
// Pure UI state for signed-out nav sign-in controls.

import { ZKLOGIN_SIGN_IN_COPY } from "@/lib/sui/zklogin/signInCopy";

export type NavSignInUiState =
  | "unavailable"
  | "canonical_only"
  | "canonical_and_legacy";

export function resolveNavSignInUiState(input: {
  configured: boolean;
  legacyRecoveryConfigured: boolean;
}): NavSignInUiState {
  if (!input.configured) return "unavailable";
  if (input.legacyRecoveryConfigured) return "canonical_and_legacy";
  return "canonical_only";
}

export const NAV_SIGN_IN_COPY = {
  open: "Connect",
  openAriaLabel: "Connect a Sui wallet or open Passport account options",
  canonical: ZKLOGIN_SIGN_IN_COPY.canonicalButton,
  legacy: ZKLOGIN_SIGN_IN_COPY.legacyButton,
  canonicalAriaLabel: ZKLOGIN_SIGN_IN_COPY.canonicalAriaLabel,
  legacyAriaLabel: ZKLOGIN_SIGN_IN_COPY.legacyAriaLabel,
  unavailable: "Sign-in unavailable",
  /** Shown in nav only when detail is requested (Passport holds full account sign-in). */
  unavailableHint: "Account sign-in is not enabled in this deployment.",
  unavailableHintSrOnly:
    "Google OAuth is not configured for this deployment. Open Passport for holder flows or configure sign-in for operators.",
} as const;
