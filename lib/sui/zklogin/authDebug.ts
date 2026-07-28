// FILE: lib/sui/zklogin/authDebug.ts
// Client-side auth lifecycle instrumentation (no secrets, no tokens).

export type AuthDebugEvent =
  | "oauth_start"
  | "oauth_redirect"
  | "oauth_callback"
  | "oauth_callback_error"
  | "zklogin_complete"
  | "zklogin_complete_error"
  | "session_saved"
  | "session_loaded"
  | "session_cleared"
  | "browser_session_mint"
  | "browser_session_mint_failed"
  | "auth_provider_ready"
  | "auth_provider_authenticated"
  | "login_in_flight_set"
  | "login_in_flight_cleared"
  | "wallet_signing_ready"
  | "wallet_signing_missing";

export interface AuthDebugPayload {
  suiAddress?: string | null;
  hasPending?: boolean;
  hasSigning?: boolean;
  hasEphemeral?: boolean;
  loginInFlight?: boolean;
  error?: string;
  detail?: string;
}

const PREFIX = "[abraxas-auth]";

function redactAddress(addr: string | null | undefined): string | null {
  if (!addr) return null;
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function logAuthEvent(event: AuthDebugEvent, payload: AuthDebugPayload = {}): void {
  if (typeof window === "undefined") return;
  const enabled =
    process.env.NODE_ENV !== "production"
    || process.env.NEXT_PUBLIC_ABRAXAS_AUTH_DEBUG === "1";
  if (!enabled) return;

  const safe = {
    ...payload,
    suiAddress: redactAddress(payload.suiAddress ?? null),
  };
  console.info(PREFIX, event, safe);
}
