"use client";
// FILE: lib/walletAuthority/client/detectMobileBrowser.ts

/** True on phone/tablet browsers (not desktop). */
export function isMobileBrowser(userAgent?: string): boolean {
  if (typeof navigator === "undefined" && !userAgent) return false;
  const ua = userAgent ?? navigator.userAgent;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
}

/** Mobile viewport heuristic (used with UA for WalletConnect offer). */
export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

export function isMobileWalletContext(userAgent?: string): boolean {
  return isMobileBrowser(userAgent) || isMobileViewport();
}
