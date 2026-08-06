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

export async function completeGoogleZkLogin(idToken: string): Promise<ZkLoginUserSession> {
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

  // Salt is server-managed so the same Google account always maps to the same Sui address.
  const regRes = await fetch("/api/auth/zklogin/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id_token: idToken,
      provider: pending.provider,
      oauth_sub: sub,
      max_epoch: pending.maxEpoch,
      login_mode: pending.loginMode ?? "canonical",
    }),
  });

  const regData = (await regRes.json()) as {
    sui_address?: string;
    user_salt?: string;
    email?: string | null;
    error?: string;
    code?: string;
    legacy_recovery_available?: boolean;
  };

  if (!regRes.ok || !regData.sui_address) {
    clearLoginInFlight();
    let err = regData.error ?? "Could not register zkLogin identity";
    if (regRes.status === 409 && regData.code === "zklogin_oauth_audience_mismatch") {
      err = ZKLOGIN_SIGN_IN_COPY.errors.audienceMismatch;
    }
    if (regRes.status === 404 && regData.code === "zklogin_no_existing_account") {
      err = regData.error ?? err;
    }
    logAuthEvent("zklogin_complete_error", { error: err, detail: regData.code });
    throw new Error(err);
  }

  // Verify client-side derivation matches server (sanity check).
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
