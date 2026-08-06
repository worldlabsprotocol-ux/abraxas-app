// FILE: lib/sui/zklogin/signInChooserState.ts
// Pure UI rules for the compact zkLogin sign-in chooser.

import { resolveNavSignInUiState } from "@/lib/nav/navSignInButtonState";

export function shouldShowLegacySignInOption(input: {
  configured: boolean;
  legacyRecoveryConfigured: boolean;
}): boolean {
  return resolveNavSignInUiState(input) === "canonical_and_legacy";
}

export function canOpenSignInChooser(input: { configured: boolean }): boolean {
  return input.configured;
}
