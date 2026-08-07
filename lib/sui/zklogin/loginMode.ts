// FILE: lib/sui/zklogin/loginMode.ts
// Propagate zkLogin sign-in mode (canonical vs legacy recovery) through OAuth and register.

import { decodeJwt } from "@mysten/sui/zklogin";
import type { ZkLoginLoginMode } from "./audienceCohorts";
import { normalizeJwtAudience } from "./audienceCohorts";
import {
  getClientCanonicalGoogleClientId,
  getClientLegacyGoogleClientId,
} from "./clientEnv";
import type { ZkLoginPendingSession } from "./session";

function readJwtAudience(idToken: string): string | null {
  try {
    const decoded = decodeJwt(idToken);
    return normalizeJwtAudience(decoded.aud as string | string[] | undefined);
  } catch {
    try {
      const parts = idToken.split(".");
      if (parts.length < 2) return null;
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8"),
      ) as { aud?: string | string[] };
      return normalizeJwtAudience(payload.aud);
    } catch {
      return null;
    }
  }
}

/** OAuth `state` values — no secrets; echoed in callback hash for mode recovery. */
export const ZKLOGIN_OAUTH_STATE = {
  canonical: "abraxas_zklogin_canonical",
  legacy_recovery: "abraxas_zklogin_legacy_recovery",
} as const satisfies Record<ZkLoginLoginMode, string>;

export function oauthStateForLoginMode(mode: ZkLoginLoginMode): string {
  return ZKLOGIN_OAUTH_STATE[mode];
}

export function loginModeFromOAuthState(state: string | null | undefined): ZkLoginLoginMode | null {
  if (!state) return null;
  if (state === ZKLOGIN_OAUTH_STATE.legacy_recovery) return "legacy_recovery";
  if (state === ZKLOGIN_OAUTH_STATE.canonical) return "canonical";
  return null;
}

/** Parse login mode echoed in OAuth implicit-flow callback hash (#state=...). */
export function parseLoginModeFromCallbackHash(hash: string): ZkLoginLoginMode | null {
  if (!hash.startsWith("#")) return null;
  const params = new URLSearchParams(hash.slice(1));
  return loginModeFromOAuthState(params.get("state"));
}

/** Infer mode from JWT aud vs browser-public OAuth client ids (no server trust). */
export function inferLoginModeFromTokenAud(idToken: string): ZkLoginLoginMode | null {
  const aud = readJwtAudience(idToken);
  if (!aud) return null;

  const legacyClientId = getClientLegacyGoogleClientId();
  const canonicalClientId = getClientCanonicalGoogleClientId();

  if (legacyClientId && aud === legacyClientId) return "legacy_recovery";
  if (canonicalClientId && aud === canonicalClientId) return "canonical";
  return null;
}

/**
 * Resolve login mode for register — pending session first, then OAuth state,
 * then JWT aud inference. Never silently downgrade legacy_recovery to canonical.
 */
export function resolveLoginModeForRegister(input: {
  pending: ZkLoginPendingSession | null;
  idToken: string;
  callbackHash?: string;
}): ZkLoginLoginMode {
  if (input.pending?.loginMode) {
    return input.pending.loginMode;
  }

  const fromState = input.callbackHash
    ? parseLoginModeFromCallbackHash(input.callbackHash)
    : null;
  if (fromState) return fromState;

  const fromAud = inferLoginModeFromTokenAud(input.idToken);
  if (fromAud) return fromAud;

  return "canonical";
}

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
