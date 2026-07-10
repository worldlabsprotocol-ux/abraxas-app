"use client";
// FILE: lib/walletAuthority/client/sessionHints.ts

import { mapWalletBindAuthFailure } from "@/lib/auth/sessionErrors";

export function mapWalletApiError(error: string, httpStatus?: number): string {
  if (httpStatus === 401 || /sign in required/i.test(error)) {
    return mapWalletBindAuthFailure(error);
  }
  return error;
}
