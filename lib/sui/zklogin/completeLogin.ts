// FILE: lib/sui/zklogin/completeLogin.ts
// Finish zkLogin after OAuth redirect — derive Sui address and register with backend.

import { jwtToAddress, decodeJwt } from "@mysten/sui/zklogin";
import {
  clearPendingSession,
  loadPendingSession,
  saveUserSession,
  type ZkLoginUserSession,
} from "./session";

export async function completeGoogleZkLogin(idToken: string): Promise<ZkLoginUserSession> {
  const pending = loadPendingSession();
  if (!pending) {
    throw new Error("Login session expired. Please sign in again.");
  }

  const decoded = decodeJwt(idToken);
  const sub = decoded.sub;
  if (!sub) throw new Error("OAuth token missing subject");

  // Salt is server-managed so the same Google account always maps to the same Sui address.
  const regRes = await fetch("/api/auth/zklogin/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id_token: idToken,
      provider: pending.provider,
      oauth_sub: sub,
      max_epoch: pending.maxEpoch,
    }),
  });

  const regData = (await regRes.json()) as {
    sui_address?: string;
    user_salt?: string;
    error?: string;
  };

  if (!regRes.ok || !regData.sui_address) {
    throw new Error(regData.error ?? "Could not register zkLogin identity");
  }

  // Verify client-side derivation matches server (sanity check).
  if (regData.user_salt) {
    const derived = jwtToAddress(idToken, regData.user_salt);
    if (derived !== regData.sui_address) {
      throw new Error("Address derivation mismatch — contact support");
    }
  }

  const jwtEmail = (decoded as Record<string, unknown>).email;
  const session: ZkLoginUserSession = {
    suiAddress: regData.sui_address,
    provider: pending.provider,
    oauthSub: sub,
    email: typeof jwtEmail === "string" ? jwtEmail : undefined,
    maxEpoch: pending.maxEpoch,
    loggedInAt: new Date().toISOString(),
  };

  saveUserSession(session);
  clearPendingSession();
  return session;
}
