// FILE: lib/auth/sessionErrors.ts
// Accurate client/server session error copy — no false cross-app assumptions.

export const CONNECT_SIGN_IN_PROMPT = "Sign in to continue with Abraxas Connect.";

export function mapBrowserSessionSetupFailure(reason: string, status?: number): string {
  if (status === 503 || /session signing unavailable/i.test(reason)) {
    return "Passport session is temporarily unavailable on this deployment. Try again shortly.";
  }
  if (status === 403 || /not registered/i.test(reason)) {
    return CONNECT_SIGN_IN_PROMPT;
  }
  if (/could not be confirmed/i.test(reason)) {
    return "Passport sign-in could not be confirmed in this browser. Try signing in again on this page.";
  }
  return CONNECT_SIGN_IN_PROMPT;
}

export function mapWalletBindAuthFailure(serverError?: string): string {
  if (serverError && !/sign in required/i.test(serverError)) {
    return serverError;
  }
  return CONNECT_SIGN_IN_PROMPT;
}

export const BROWSER_SESSION_HINT =
  "Sign in on this page to continue wallet binding and consent.";
