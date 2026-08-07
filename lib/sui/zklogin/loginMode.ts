// FILE: lib/sui/zklogin/loginMode.ts
// zkLogin login-mode helpers (server-trusted mode comes from oauthLoginState only).

import type { ZkLoginLoginMode } from "./audienceCohorts";

/** Suggested alternate sign-in path after audience mismatch (409). */
export function suggestLoginModeAfterAudienceMismatch(
  attemptedMode: ZkLoginLoginMode,
  legacyRecoveryAvailable: boolean,
): ZkLoginLoginMode {
  if (attemptedMode === "legacy_recovery") {
    return "canonical";
  }
  return legacyRecoveryAvailable ? "legacy_recovery" : "canonical";
}
