// FILE: lib/sui/zklogin/resolveEmail.ts
// Resolve Google email from session, signing JWT, or server — single source for Verify submit.

import { logAuthEvent } from "./authDebug";
import { emailFromIdToken } from "./emailFromToken";
import { loadUserSession, saveUserSession } from "./session";
import { loadSigningSession } from "./signingSession";

export { emailFromIdToken } from "./emailFromToken";

function persistEmailLocally(email: string): void {
  const current = loadUserSession();
  if (!current) return;
  if (current.email === email) return;
  const updated = { ...current, email };
  saveUserSession(updated);
  logAuthEvent("session_saved", { suiAddress: current.suiAddress, detail: "email_hydrated" });
}

/** Best-effort read from local stores only (no network). */
export function readLocalZkLoginEmail(): string | null {
  const session = loadUserSession();
  if (session?.email?.includes("@")) return session.email;

  const signing = loadSigningSession();
  if (signing?.idToken) {
    const fromJwt = emailFromIdToken(signing.idToken);
    if (fromJwt) {
      persistEmailLocally(fromJwt);
      return fromJwt;
    }
  }

  return null;
}

/**
 * Resolve email for Verify submit — local JWT first, then server sync.
 * Never asks the user to sign in again when id_token is present.
 */
export async function resolveZkLoginEmail(suiAddress: string): Promise<string | null> {
  const local = readLocalZkLoginEmail();
  if (local) {
    logAuthEvent("auth_provider_ready", { suiAddress, detail: `email_local:${local.split("@")[1]}` });
    return local;
  }

  const signing = loadSigningSession();

  try {
    const meRes = await fetch("/api/auth/zklogin/me", { credentials: "include" });
    if (meRes.ok) {
      const data = await meRes.json() as { email?: string | null };
      if (data.email?.includes("@")) {
        persistEmailLocally(data.email);
        logAuthEvent("auth_provider_ready", { suiAddress, detail: "email_from_me_api" });
        return data.email;
      }
    }
  } catch { /* best-effort */ }

  if (!signing?.idToken) {
    logAuthEvent("zklogin_complete_error", { suiAddress, error: "email_missing_no_id_token" });
    return null;
  }

  try {
    const syncRes = await fetch("/api/auth/zklogin/sync-email", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: signing.idToken }),
    });
    const syncData = await syncRes.json() as { email?: string | null; error?: string };
    if (syncRes.ok && syncData.email?.includes("@")) {
      persistEmailLocally(syncData.email);
      logAuthEvent("auth_provider_ready", { suiAddress, detail: "email_synced_to_db" });
      return syncData.email;
    }
    logAuthEvent("zklogin_complete_error", {
      suiAddress,
      error: syncData.error ?? `sync_email_http_${syncRes.status}`,
    });
  } catch (e) {
    logAuthEvent("zklogin_complete_error", {
      suiAddress,
      error: e instanceof Error ? e.message : "sync_email_failed",
    });
  }

  return emailFromIdToken(signing.idToken);
}
