// FILE: lib/sui/zklogin/signInChooserState.ts
// Pure UI rules for the compact zkLogin sign-in chooser.

import { resolveNavSignInUiState } from "@/lib/nav/navSignInButtonState";

/** Customer surfaces defer legacy recovery; founder repair stays on /passport/advanced. */
export function shouldShowLegacySignInOption(_input: {
  configured: boolean;
  legacyRecoveryConfigured: boolean;
}): boolean {
  return false;
}

/** Advanced Passport surfaces may expose legacy recovery when configured. */
export function shouldShowLegacySignInOptionOnAdvanced(input: {
  configured: boolean;
  legacyRecoveryConfigured: boolean;
}): boolean {
  return resolveNavSignInUiState(input) === "canonical_and_legacy";
}

export function canOpenSignInChooser(input: { configured: boolean }): boolean {
  return input.configured;
}
