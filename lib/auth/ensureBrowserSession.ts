// FILE: lib/auth/ensureBrowserSession.ts
// Mint and verify the httpOnly browser session cookie for API calls.

import { loadUserSession } from "@/lib/sui/zklogin/session";
import { loadSigningSession } from "@/lib/sui/zklogin/signingSession";
import { logAuthEvent, toAuthErrorCode } from "@/lib/sui/zklogin/authDebug";

export type BrowserSessionProbe = {
  ok: boolean;
  holderSubjectId?: string | null;
  suiAddress?: string | null;
  authMethod?: string | null;
  walletCaip10?: string | null;
};

export async function probeBrowserSession(): Promise<boolean> {
  const probe = await probeBrowserSessionDetails();
  return probe.ok;
}

export async function probeBrowserSessionDetails(): Promise<BrowserSessionProbe> {
  if (typeof window === "undefined") return { ok: false };
  try {
    const res = await fetch("/api/auth/browser-session", {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return { ok: false };
    const data = await res.json() as {
      ok?: boolean;
      holder_subject_id?: string | null;
      sui_address?: string | null;
      auth_method?: string | null;
      wallet_caip10?: string | null;
    };
    if (data.ok !== true) return { ok: false };
    return {
      ok: true,
      holderSubjectId: data.holder_subject_id ?? null,
      suiAddress: data.sui_address ?? null,
      authMethod: data.auth_method ?? null,
      walletCaip10: data.wallet_caip10 ?? null,
    };
  } catch {
    return { ok: false };
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
  for (let attempt = 0; attempt < READY_PROBE_ATTEMPTS; attempt += 1) {
    if (await probeBrowserSession()) {
      return { ok: true };
    }
    if (attempt === 0) {
      const minted = await ensureBrowserSession(suiAddress);
      if (!minted.ok) return minted;
    }
    await new Promise((resolve) => setTimeout(resolve, READY_PROBE_DELAY_MS));
  }

  return { ok: false, error: "Browser session could not be confirmed" };
}

/** Confirm an httpOnly session minted by wallet auth (no OAuth mint path). */
export async function ensureBrowserSessionReadyForWalletAuth(): Promise<{
  ok: boolean;
  error?: string;
}> {
  for (let attempt = 0; attempt < READY_PROBE_ATTEMPTS; attempt += 1) {
    const probe = await probeBrowserSessionDetails();
    if (probe.ok) {
      return { ok: true };
    }
    await new Promise((resolve) => setTimeout(resolve, READY_PROBE_DELAY_MS));
  }
  return { ok: false, error: "Browser session could not be confirmed" };
}
