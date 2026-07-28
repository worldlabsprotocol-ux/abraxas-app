// FILE: lib/sui/zklogin/startLogin.ts
// Start Google zkLogin — ephemeral key + nonce + OAuth redirect.

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { generateNonce, generateRandomness } from "@mysten/sui/zklogin";
import { buildGoogleOAuthUrl, isZkLoginConfigured } from "./config";
import { savePendingSession } from "./session";
import {
  clearLoginInFlight,
  clearStaleLoginInFlight,
  isLoginInFlight,
  setLoginInFlight,
} from "./loginInFlight";
import { logAuthEvent } from "./authDebug";
import { fetchLoginMaxEpoch } from "./fetchLoginEpoch";

export async function startGoogleZkLogin(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isZkLoginConfigured()) {
    return {
      ok: false,
      error: "Google OAuth not configured. Set NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID — see docs/ZKLOGIN_BACKEND_SETUP.md",
    };
  }

  clearStaleLoginInFlight();
  logAuthEvent("oauth_start");

  if (isLoginInFlight()) {
    logAuthEvent("oauth_start", { error: "blocked_by_login_in_flight" });
    return { ok: false, error: "Sign-in already in progress. Wait a moment and try again." };
  }

  setLoginInFlight(true);

  try {
    const epochResult = await fetchLoginMaxEpoch();
    if (!epochResult.ok) {
      clearLoginInFlight();
      logAuthEvent("oauth_start", { error: epochResult.error });
      return { ok: false, error: epochResult.error };
    }

    const maxEpoch = epochResult.maxEpoch;
    logAuthEvent("oauth_start", {
      detail: `epoch via ${epochResult.rpcHost} (${epochResult.network})`,
    });

    const ephemeralKeypair = Ed25519Keypair.generate();
    const randomness = generateRandomness();
    const nonce = generateNonce(ephemeralKeypair.getPublicKey(), maxEpoch, randomness);

    savePendingSession({
      ephemeralSecretKey: ephemeralKeypair.getSecretKey(),
      randomness,
      maxEpoch,
      provider: "google",
      startedAt: new Date().toISOString(),
    });

    const url = buildGoogleOAuthUrl(nonce);
    if (!url) {
      clearLoginInFlight();
      return { ok: false, error: "Could not build OAuth URL" };
    }

    logAuthEvent("oauth_redirect");
    window.location.assign(url);
    return { ok: true };
  } catch (e) {
    clearLoginInFlight();
    const msg = e instanceof Error ? e.message : "Unexpected sign-in error";
    logAuthEvent("oauth_start", { error: msg });
    return {
      ok: false,
      error: `Sign-in failed: ${msg}`,
    };
  }
}

export { clearLoginInFlight, clearStaleLoginInFlight } from "./loginInFlight";
