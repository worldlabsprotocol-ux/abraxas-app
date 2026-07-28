// FILE: lib/auth/ensureBrowserSession.ts
// Mint and verify the httpOnly browser session cookie for API calls.

import { logAuthEvent } from "@/lib/sui/zklogin/authDebug";

export async function ensureBrowserSession(suiAddress: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  logAuthEvent("browser_session_mint", { suiAddress, detail: "start" });

  try {
    const res = await fetch("/api/auth/browser-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ sui_address: suiAddress }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      const error = data.error ?? `Browser session failed (${res.status})`;
      logAuthEvent("browser_session_mint_failed", { suiAddress, error });
      return { ok: false, error };
    }

    logAuthEvent("browser_session_mint", { suiAddress, detail: "ok" });
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Network error";
    logAuthEvent("browser_session_mint_failed", { suiAddress, error });
    return { ok: false, error };
  }
}
