// FILE: lib/auth/ensureBrowserSession.ts
// Mint and verify the httpOnly browser session cookie for API calls.

import { loadUserSession } from "@/lib/sui/zklogin/session";
import { loadSigningSession } from "@/lib/sui/zklogin/signingSession";
import { logAuthEvent, toAuthErrorCode } from "@/lib/sui/zklogin/authDebug";

export async function probeBrowserSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/auth/browser-session", {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = await res.json() as { ok?: boolean };
    return data.ok === true;
  } catch {
    return false;
  }
}

export async function ensureBrowserSession(suiAddress: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  logAuthEvent("browser_session_mint", { detail: "start" });

  const signing = typeof window !== "undefined" ? loadSigningSession() : null;
  const user = typeof window !== "undefined" ? loadUserSession() : null;

  const idToken =
    signing?.suiAddress === suiAddress ? signing.idToken
    : undefined;
  const oauthSub = user?.suiAddress === suiAddress ? user.oauthSub : undefined;

  if (!idToken) {
    const error = "Sign in again — OAuth session expired";
    logAuthEvent("browser_session_mint_failed", { errorCode: "oauth_state_invalid" });
    return { ok: false, error };
  }

  try {
    const res = await fetch("/api/auth/browser-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        sui_address: suiAddress,
        id_token: idToken,
        oauth_sub: oauthSub,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      const error = data.error ?? `Browser session failed (${res.status})`;
      logAuthEvent("browser_session_mint_failed", {
        errorCode: toAuthErrorCode(error, "browser_session_mint_failed"),
      });
      return { ok: false, error };
    }

    logAuthEvent("browser_session_mint", { detail: "ok" });
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Network error";
    logAuthEvent("browser_session_mint_failed", {
      errorCode: toAuthErrorCode(error, "browser_session_mint_failed"),
    });
    return { ok: false, error };
  }
}

const READY_PROBE_ATTEMPTS = 4;
const READY_PROBE_DELAY_MS = 80;

export async function ensureBrowserSessionReady(suiAddress: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const minted = await ensureBrowserSession(suiAddress);
  if (!minted.ok) return minted;

  for (let attempt = 0; attempt < READY_PROBE_ATTEMPTS; attempt += 1) {
    if (await probeBrowserSession()) {
      return { ok: true };
    }
    await new Promise((resolve) => setTimeout(resolve, READY_PROBE_DELAY_MS));
  }

  return { ok: false, error: "Browser session could not be confirmed" };
}
