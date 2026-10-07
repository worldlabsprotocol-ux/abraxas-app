// FILE: lib/sui/zklogin/consumeNativeHandoff.ts
// Bind native holder handoff into the in-app WebView session store.

import { saveUserSession, type ZkLoginUserSession } from "./session";
import { NATIVE_HANDOFF_QUERY } from "./nativeHandoff";
import { logAuthEvent } from "./authDebug";

export async function consumeNativeHandoffFromQuery(
  searchParams: URLSearchParams,
): Promise<ZkLoginUserSession | null> {
  const token = searchParams.get(NATIVE_HANDOFF_QUERY)?.trim();
  if (!token) return null;

  const res = await fetch("/api/auth/zklogin/native-handoff/consume", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handoff_token: token }),
  });

  if (!res.ok) {
    logAuthEvent("native_handoff_consume_failed");
    return null;
  }

  const data = (await res.json()) as {
    sui_address?: string;
    email?: string | null;
    provider?: string;
  };

  if (!data.sui_address) return null;

  const session: ZkLoginUserSession = {
    suiAddress: data.sui_address,
    provider: data.provider === "apple" ? "apple" : "google",
    email: typeof data.email === "string" ? data.email : undefined,
    maxEpoch: 0,
    loggedInAt: new Date().toISOString(),
    sessionKind: "oauth",
  };

  saveUserSession(session);
  logAuthEvent("native_handoff_consumed");
  return session;
}
