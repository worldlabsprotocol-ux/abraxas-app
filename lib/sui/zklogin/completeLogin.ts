// FILE: lib/sui/zklogin/completeLogin.ts
// Finish zkLogin after OAuth redirect — derive Sui address and register with backend.

import { jwtToAddress, decodeJwt } from "@mysten/sui/zklogin";
import {
  clearPendingSession,
  loadPendingSession,
  loadUserSession,
  saveUserSession,
  type ZkLoginUserSession,
} from "./session";
import { persistEphemeralKey, saveSigningSession } from "./signingSession";
import { clearLoginInFlight } from "./loginInFlight";
import { logAuthEvent } from "./authDebug";
import { ZKLOGIN_SIGN_IN_COPY } from "./signInCopy";
import { ensureBrowserSession } from "@/lib/auth/ensureBrowserSession";
import type { ZkLoginLoginMode } from "./audienceCohorts";
import {
  parseOAuthStateFromCallbackHash,
  ZKLOGIN_SIGN_IN_EXPIRED_MESSAGE,
} from "./oauthLoginState";
import {
  resolveSuggestedLoginMode,
  ZkLoginSignInRecoveryError,
} from "./signInRecovery";

type RegisterFailureBody = {
  sui_address?: string;
  user_salt?: string;
  email?: string | null;
  error?: string;
  code?: string;
  legacy_recovery_available?: boolean;
  suggested_login_mode?: ZkLoginLoginMode;
};

export function mapRegisterFailureToUserError(
  status: number,
  body: RegisterFailureBody,
  attemptedMode: ZkLoginLoginMode,
): string {
  if (status === 409 && body.code === "zklogin_oauth_audience_mismatch") {
    const suggested = body.suggested_login_mode;
    if (attemptedMode === "legacy_recovery" || suggested === "canonical") {
      return ZKLOGIN_SIGN_IN_COPY.errors.wrongPathForCanonical;
    }
    if (body.legacy_recovery_available) {
      return ZKLOGIN_SIGN_IN_COPY.errors.audienceMismatchDetail;
    }
    return ZKLOGIN_SIGN_IN_COPY.errors.audienceMismatch;
  }

  if (status === 400 && body.code === "zklogin_legacy_client_required") {
    return attemptedMode === "legacy_recovery"
      ? ZKLOGIN_SIGN_IN_COPY.errors.wrongPathForLegacyRecovery
      : (body.error ?? ZKLOGIN_SIGN_IN_COPY.errors.legacyClientRequired);
  }

  if (status === 404 && body.code === "zklogin_no_existing_account") {
    return body.error ?? ZKLOGIN_SIGN_IN_COPY.errors.noExistingAccount;
  }

  return body.error ?? "Could not register zkLogin identity";
}

export async function resolveVerifiedLoginMode(callbackHash?: string): Promise<ZkLoginLoginMode> {
  const oauthState = callbackHash ? parseOAuthStateFromCallbackHash(callbackHash) : null;
  if (!oauthState) {
    throw new Error(ZKLOGIN_SIGN_IN_EXPIRED_MESSAGE);
  }

  const res = await fetch("/api/auth/zklogin/consume-login-state", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oauth_state: oauthState }),
  });

  if (!res.ok) {
    throw new Error(ZKLOGIN_SIGN_IN_EXPIRED_MESSAGE);
  }

  const data = (await res.json()) as { login_mode?: string };
  if (data.login_mode === "legacy_recovery" || data.login_mode === "canonical") {
    return data.login_mode;
  }

  throw new Error(ZKLOGIN_SIGN_IN_EXPIRED_MESSAGE);
}

export async function completeGoogleZkLogin(
  idToken: string,
  options?: { callbackHash?: string },
): Promise<ZkLoginUserSession> {
  logAuthEvent("oauth_callback");

  const pending = loadPendingSession();
  if (!pending) {
    const existing = loadUserSession();
    if (existing) {
      logAuthEvent("zklogin_complete", { suiAddress: existing.suiAddress, detail: "existing_session" });
      return existing;
    }
    clearLoginInFlight();
    logAuthEvent("zklogin_complete_error", {
      error: "pending_session_missing",
      detail: "OAuth returned but browser lost the in-flight signing key (sessionStorage cleared during redirect).",
    });
    throw new Error(
      "Sign-in could not finish: this browser lost the temporary signing key during Google redirect. "
      + "Disable private browsing, allow site storage, then tap Sign in once more.",
    );
  }

  const decoded = decodeJwt(idToken);
  const sub = decoded.sub;
  if (!sub) {
    clearLoginInFlight();
    throw new Error("OAuth token missing subject");
  }

  let loginMode: ZkLoginLoginMode;
  try {
    loginMode = await resolveVerifiedLoginMode(options?.callbackHash);
  } catch (e) {
    clearLoginInFlight();
    const err = e instanceof Error ? e.message : ZKLOGIN_SIGN_IN_EXPIRED_MESSAGE;
    logAuthEvent("zklogin_complete_error", { error: err, detail: "oauth_state_invalid" });
    throw new Error(err);
  }

  logAuthEvent("oauth_callback", { detail: `login_mode=${loginMode}` });

  const regRes = await fetch("/api/auth/zklogin/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id_token: idToken,
      provider: pending.provider,
      oauth_sub: sub,
      max_epoch: pending.maxEpoch,
      login_mode: loginMode,
    }),
  });

  const regData = (await regRes.json()) as RegisterFailureBody;

  if (!regRes.ok || !regData.sui_address) {
    clearLoginInFlight();
    const err = mapRegisterFailureToUserError(regRes.status, regData, loginMode);
    logAuthEvent("zklogin_complete_error", { error: err, detail: regData.code });
    const suggestedMode = resolveSuggestedLoginMode(regRes.status, regData, loginMode);
    if (suggestedMode) {
      throw new ZkLoginSignInRecoveryError(err, suggestedMode);
    }
    throw new Error(err);
  }

  if (regData.user_salt) {
    const derived = jwtToAddress(idToken, regData.user_salt);
    if (derived !== regData.sui_address) {
      clearLoginInFlight();
      throw new Error(ZKLOGIN_SIGN_IN_COPY.errors.addressMismatch);
    }
  }

  const jwtEmail = (decoded as Record<string, unknown>).email;
  const resolvedEmail =
    (typeof regData.email === "string" && regData.email.includes("@") ? regData.email : null)
    ?? (typeof jwtEmail === "string" ? jwtEmail : undefined);

  const session: ZkLoginUserSession = {
    suiAddress: regData.sui_address,
    provider: pending.provider,
    oauthSub: sub,
    email: resolvedEmail,
    maxEpoch: pending.maxEpoch,
    loggedInAt: new Date().toISOString(),
  };

  saveUserSession(session);
  persistEphemeralKey(pending.ephemeralSecretKey);

  if (regData.user_salt) {
    saveSigningSession({
      suiAddress: regData.sui_address,
      idToken,
      userSalt: regData.user_salt,
      jwtRandomness: pending.randomness,
      maxEpoch: pending.maxEpoch,
    });
  }

  clearPendingSession();
  logAuthEvent("session_saved", { suiAddress: session.suiAddress });

  const browserSession = await ensureBrowserSession(regData.sui_address);
  if (!browserSession.ok) {
    logAuthEvent("browser_session_mint_failed", {
      suiAddress: regData.sui_address,
      error: browserSession.error,
    });
  }

  logAuthEvent("zklogin_complete", { suiAddress: session.suiAddress });
  return session;
}
