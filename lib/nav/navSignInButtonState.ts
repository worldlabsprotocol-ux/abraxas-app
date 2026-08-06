// FILE: lib/nav/navSignInButtonState.ts
// Pure UI state for signed-out nav sign-in controls.

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
  canonical: "Continue with Google",
  legacy: "Existing account sign-in",
  unavailable: "Sign-in unavailable",
  unavailableHint: "Google sign-in is not configured for this environment.",
} as const;
