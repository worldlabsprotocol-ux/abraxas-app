"use client";
// FILE: lib/walletAuthority/client/sessionHints.ts

const SESSION_HINT =
  "Sign in required in this browser. Passport sessions do not carry over from another app (e.g. Brave → MetaMask).";

export function mapWalletApiError(error: string, httpStatus?: number): string {
  if (httpStatus === 401 || /sign in required/i.test(error)) {
    return SESSION_HINT;
  }
  return error;
}

export { SESSION_HINT };
