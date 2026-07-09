// FILE: lib/auth/sessionErrors.ts
// Accurate client/server session error copy — no false cross-app assumptions.

export function mapBrowserSessionSetupFailure(reason: string, status?: number): string {
  if (status === 503 || /session signing unavailable/i.test(reason)) {
    return "Passport session is temporarily unavailable on this deployment. Try again shortly.";
  }
  if (status === 403 || /not registered/i.test(reason)) {
    return "Complete Passport sign-in first, then return to bind your wallet.";
  }
  return "Sign in to Passport in this browser before binding your wallet.";
}

export function mapWalletBindAuthFailure(serverError?: string): string {
  if (serverError && !/sign in required/i.test(serverError)) {
    return serverError;
  }
  return "Sign in to Passport in this browser before binding your wallet. If you already signed in on this page, open Passport once and try again.";
}

export const BROWSER_SESSION_HINT =
  "Passport sign-in applies to this browser tab only. Complete sign-in here before binding.";
