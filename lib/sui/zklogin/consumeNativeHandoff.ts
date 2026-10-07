// FILE: lib/sui/zklogin/consumeNativeHandoff.ts
// Bind native holder handoff into the in-app WebView session store.

import {
  saveUserSession,
  saveEphemeralSecretKey,
  type ZkLoginUserSession,
} from "./session";
import { saveSigningSession } from "./signingSession";
import {
  NATIVE_CONSUME_VERIFIER_SESSION_KEY,
  NATIVE_HANDOFF_CODE_QUERY,
} from "./nativeHandoff";
import { logAuthEvent } from "./authDebug";
import { readSessionStorage, removeSessionStorage } from "./browserStorage";
import { ensureBrowserSession } from "@/lib/auth/ensureBrowserSession";

export async function consumeNativeHandoffFromQuery(
  searchParams: URLSearchParams,
): Promise<ZkLoginUserSession | null> {
  const handoffCode = searchParams.get(NATIVE_HANDOFF_CODE_QUERY)?.trim();
  if (!handoffCode) return null;

  const consumeVerifier = readSessionStorage(NATIVE_CONSUME_VERIFIER_SESSION_KEY)?.trim();
  if (!consumeVerifier) {
    logAuthEvent("native_handoff_consume_failed", { errorCode: "missing_consume_verifier" });
    return null;
  }

  const res = await fetch("/api/auth/zklogin/native-handoff/consume", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      handoff_code: handoffCode,
      consume_verifier: consumeVerifier,
    }),
  });

  removeSessionStorage(NATIVE_CONSUME_VERIFIER_SESSION_KEY);

  if (!res.ok) {
    logAuthEvent("native_handoff_consume_failed");
    return null;
  }

  const data = (await res.json()) as {
    sui_address?: string;
    email?: string | null;
    provider?: string;
    oauth_sub?: string;
    max_epoch?: number;
    user_salt?: string;
    randomness?: string;
    ephemeral_secret_key?: string;
    id_token?: string;
  };

  if (!data.sui_address || !data.id_token || !data.user_salt || !data.randomness || !data.ephemeral_secret_key) {
    logAuthEvent("native_handoff_consume_failed", { errorCode: "incomplete_handoff_payload" });
    return null;
  }

  const session: ZkLoginUserSession = {
    suiAddress: data.sui_address,
    provider: data.provider === "apple" ? "apple" : "google",
    oauthSub: data.oauth_sub,
    email: typeof data.email === "string" ? data.email : undefined,
    maxEpoch: typeof data.max_epoch === "number" ? data.max_epoch : 0,
    loggedInAt: new Date().toISOString(),
    sessionKind: "oauth",
  };

  saveUserSession(session);
  saveEphemeralSecretKey(data.ephemeral_secret_key);
  saveSigningSession({
    suiAddress: data.sui_address,
    idToken: data.id_token,
    userSalt: data.user_salt,
    jwtRandomness: data.randomness,
    maxEpoch: session.maxEpoch,
  });

  const browserSession = await ensureBrowserSession(data.sui_address);
  if (!browserSession.ok) {
    logAuthEvent("browser_session_mint_failed", {
      errorCode: "native_handoff_browser_session",
    });
  }

  logAuthEvent("native_handoff_consumed");
  return session;
}
