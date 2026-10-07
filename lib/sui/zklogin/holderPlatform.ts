// FILE: lib/sui/zklogin/holderPlatform.ts
// Detect Abraxas holder native shell (Capacitor) and canonical OAuth origins.

import { SITE_URL } from "@/lib/siteUrl";
import { ZKLOGIN_CALLBACK_PATH } from "./config";

export type HolderAuthPlatform = "android_native" | "ios_native";

function canonicalHolderOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      const localhostDev =
        parsed.protocol === "http:" && parsed.hostname === "localhost";
      if (parsed.protocol === "https:" || localhostDev) {
        return parsed.origin;
      }
    } catch {
      // Ignore malformed runtime env; fall back to SITE_URL.
    }
  }
  return SITE_URL.replace(/\/$/, "");
}

/** True when running inside the Abraxas Capacitor holder APK/shell. */
export function isNativeHolderApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Dynamic import shape — @capacitor/core is bundled for web + native builds.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require("@capacitor/core") as typeof import("@capacitor/core");
    if (!Capacitor?.isNativePlatform?.()) return false;
    const platform = Capacitor.getPlatform();
    return platform === "android" || platform === "ios";
  } catch {
    return false;
  }
}

export function resolveHolderAuthPlatform(): HolderAuthPlatform | null {
  if (!isNativeHolderApp()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require("@capacitor/core") as typeof import("@capacitor/core");
    return Capacitor.getPlatform() === "ios" ? "ios_native" : "android_native";
  } catch {
    return "android_native";
  }
}

/**
 * OAuth redirect must stay on canonical production HTTPS — never capacitor:// or localhost
 * origins observed inside embedded WebViews.
 */
export function getNativeHolderRedirectUri(): string {
  return `${canonicalHolderOrigin()}${ZKLOGIN_CALLBACK_PATH}`;
}

export function getNativeHolderOrigin(): string {
  return canonicalHolderOrigin();
}
