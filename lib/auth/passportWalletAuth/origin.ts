// FILE: lib/auth/passportWalletAuth/origin.ts

import { getPublicAppOrigin } from "@/lib/app/publicAppOrigin";

export function resolvePassportWalletRequestOrigin(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-host");
  const host = forwarded ?? req.headers.get("host") ?? "";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  if (host) {
    try {
      return new URL(`${proto}://${host}`).origin;
    } catch {
      // fall through
    }
  }
  return getPublicAppOrigin();
}

export function isAllowedPassportWalletOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol === "http:") {
      return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    }
    if (parsed.protocol !== "https:") return false;
    return !parsed.hostname.includes("*");
  } catch {
    return false;
  }
}

export function originsMatch(expected: string, actual: string): boolean {
  try {
    return new URL(expected).origin === new URL(actual).origin;
  } catch {
    return false;
  }
}
