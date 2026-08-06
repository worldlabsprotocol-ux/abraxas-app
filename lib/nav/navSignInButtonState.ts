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
  canonical: ZKLOGIN_SIGN_IN_COPY.canonicalButton,
  legacy: ZKLOGIN_SIGN_IN_COPY.legacyButton,
  canonicalAriaLabel: ZKLOGIN_SIGN_IN_COPY.canonicalAriaLabel,
  legacyAriaLabel: ZKLOGIN_SIGN_IN_COPY.legacyAriaLabel,
  unavailable: "Sign-in unavailable",
  unavailableHint: "Google sign-in is not configured for this environment.",
} as const;
