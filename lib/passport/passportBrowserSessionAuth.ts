// FILE: lib/passport/passportBrowserSessionAuth.ts
// Canonical browser-session auth state for Passport secure actions.

export const BROWSER_SESSION_AUTH_ERROR = "Sign in required in this browser";

export type PassportBrowserSessionState =
  | "idle"
  | "loading"
  | "authenticated"
  | "reauthentication_required"
  | "session_probe_failed";

export function isBrowserSessionAuthError(message: string): boolean {
  return message === BROWSER_SESSION_AUTH_ERROR
    || message.toLowerCase().includes("sign in again")
    || message.toLowerCase().includes("oauth session expired");
}

export function isBrowserSessionAuthFailure(status: number, message?: string | null): boolean {
  return status === 401 && (!message || isBrowserSessionAuthError(message));
}
