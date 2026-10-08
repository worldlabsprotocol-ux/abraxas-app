// FILE: lib/sui/zklogin/consumeNativeHandoff.ts
// Bind native holder handoff into the in-app WebView session store.

import {
  saveUserSession,
  saveEphemeralSecretKey,
  type ZkLoginUserSession,
} from "./session";
import { saveSigningSession } from "./signingSession";
import { NATIVE_HANDOFF_CODE_QUERY } from "./nativeHandoff";
import { logAuthEvent } from "./authDebug";
import { ensureBrowserSession } from "@/lib/auth/ensureBrowserSession";
import { clearLoginInFlight } from "./loginInFlight";
import {
  clearNativeConsumeVerifier,
  dispatchNativeHandoffSettled,
  isTerminalNativeHandoffConsumeStatus,
  isValidHandoffCode,
  readNativeConsumeVerifier,
} from "./nativeHandoffClient";

const consumeInflight = new Map<string, Promise<ZkLoginUserSession | null>>();

export function resetNativeHandoffConsumeInflightForTests(): void {
  consumeInflight.clear();
}

async function consumeNativeHandoffInternal(
  handoffCode: string,
): Promise<ZkLoginUserSession | null> {
  const consumeVerifier = readNativeConsumeVerifier();
  if (!consumeVerifier) {
    logAuthEvent("native_handoff_consume_failed", { errorCode: "missing_consume_verifier" });
    clearLoginInFlight();
    dispatchNativeHandoffSettled({ ok: false, reason: "missing_consume_verifier" });
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

  if (!res.ok) {
    logAuthEvent("native_handoff_consume_failed", { errorCode: String(res.status) });
    if (isTerminalNativeHandoffConsumeStatus(res.status)) {
      clearNativeConsumeVerifier();
    }
    clearLoginInFlight();
    dispatchNativeHandoffSettled({ ok: false, reason: "consume_rejected" });
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
    clearNativeConsumeVerifier();
    clearLoginInFlight();
    dispatchNativeHandoffSettled({ ok: false, reason: "incomplete_handoff_payload" });
    return null;
  }

  clearNativeConsumeVerifier();

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

  clearLoginInFlight();
  logAuthEvent("native_handoff_consumed");
  dispatchNativeHandoffSettled({ ok: true });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("abraxas:zklogin-session"));
  }
  return session;
}

export async function consumeNativeHandoffFromQuery(
  searchParams: URLSearchParams,
): Promise<ZkLoginUserSession | null> {
  const handoffCode = searchParams.get(NATIVE_HANDOFF_CODE_QUERY)?.trim();
  if (!handoffCode || !isValidHandoffCode(handoffCode)) return null;

  const inflight = consumeInflight.get(handoffCode);
  if (inflight) return inflight;

  const promise = consumeNativeHandoffInternal(handoffCode).finally(() => {
    consumeInflight.delete(handoffCode);
  });
  consumeInflight.set(handoffCode, promise);
  return promise;
}
