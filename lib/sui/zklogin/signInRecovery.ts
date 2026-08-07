// FILE: lib/sui/zklogin/signInRecovery.ts
// Persist zkLogin wrong-path recovery guidance until dismiss or next sign-in attempt.

import type { ZkLoginLoginMode } from "./audienceCohorts";
import { suggestLoginModeAfterAudienceMismatch } from "./loginMode";
import { ZKLOGIN_SIGN_IN_COPY } from "./signInCopy";

export const SIGN_IN_RECOVERY_STORAGE_KEY = "abraxas_zklogin_sign_in_recovery";
export const SIGN_IN_ERROR_QUERY = "sign_in_error";
export const SUGGESTED_LOGIN_MODE_QUERY = "suggested_login_mode";

export type SignInRecoveryState = {
  message: string;
  suggestedMode: ZkLoginLoginMode | null;
  createdAt: string;
};

export class ZkLoginSignInRecoveryError extends Error {
  readonly suggestedMode: ZkLoginLoginMode | null;

  constructor(message: string, suggestedMode: ZkLoginLoginMode | null = null) {
    super(message);
    this.name = "ZkLoginSignInRecoveryError";
    this.suggestedMode = suggestedMode;
  }
}

type RegisterFailureBody = {
  code?: string;
  legacy_recovery_available?: boolean;
  suggested_login_mode?: ZkLoginLoginMode;
  error?: string;
};

export function resolveSuggestedLoginMode(
  status: number,
  body: RegisterFailureBody,
  attemptedMode: ZkLoginLoginMode,
): ZkLoginLoginMode | null {
  if (status === 409 && body.code === "zklogin_oauth_audience_mismatch") {
    return body.suggested_login_mode
      ?? suggestLoginModeAfterAudienceMismatch(
        attemptedMode,
        body.legacy_recovery_available ?? false,
      );
  }
  return null;
}

export function buildSignInRecoveryFromRegisterFailure(
  status: number,
  body: RegisterFailureBody,
  attemptedMode: ZkLoginLoginMode,
  message: string,
): SignInRecoveryState | null {
  const suggestedMode = resolveSuggestedLoginMode(status, body, attemptedMode);
  if (!suggestedMode) return null;

  return {
    message,
    suggestedMode,
    createdAt: new Date().toISOString(),
  };
}

export function parseSignInRecoveryFromSearchParams(
  params: URLSearchParams,
): SignInRecoveryState | null {
  const message = params.get(SIGN_IN_ERROR_QUERY)?.trim();
  if (!message) return null;

  const suggestedRaw = params.get(SUGGESTED_LOGIN_MODE_QUERY);
  const suggestedMode = suggestedRaw === "legacy_recovery" || suggestedRaw === "canonical"
    ? suggestedRaw
    : null;

  return {
    message,
    suggestedMode,
    createdAt: new Date().toISOString(),
  };
}

export function buildPassportRecoveryQuery(recovery: SignInRecoveryState): string {
  const params = new URLSearchParams();
  params.set(SIGN_IN_ERROR_QUERY, recovery.message);
  if (recovery.suggestedMode) {
    params.set(SUGGESTED_LOGIN_MODE_QUERY, recovery.suggestedMode);
  }
  return params.toString();
}

export function saveSignInRecovery(recovery: SignInRecoveryState): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SIGN_IN_RECOVERY_STORAGE_KEY, JSON.stringify(recovery));
}

export function loadSignInRecovery(): SignInRecoveryState | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SIGN_IN_RECOVERY_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SignInRecoveryState;
    if (!parsed?.message || typeof parsed.message !== "string") return null;
    if (
      parsed.suggestedMode !== null
      && parsed.suggestedMode !== "canonical"
      && parsed.suggestedMode !== "legacy_recovery"
    ) {
      return { ...parsed, suggestedMode: null };
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSignInRecovery(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SIGN_IN_RECOVERY_STORAGE_KEY);
}

export function recoveryPrimaryActionLabel(
  suggestedMode: ZkLoginLoginMode,
): string {
  return suggestedMode === "legacy_recovery"
    ? ZKLOGIN_SIGN_IN_COPY.legacyButton
    : ZKLOGIN_SIGN_IN_COPY.canonicalButton;
}

export function recoveryPrimaryActionHelper(
  suggestedMode: ZkLoginLoginMode,
): string {
  return suggestedMode === "legacy_recovery"
    ? ZKLOGIN_SIGN_IN_COPY.legacyHelper
    : ZKLOGIN_SIGN_IN_COPY.canonicalHelper;
}
