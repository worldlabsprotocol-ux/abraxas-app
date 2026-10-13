// FILE: lib/auth/passportWalletAuth/origin.ts

import {
  getPublicAppOriginFromRequest,
  isTrustedPublicAppOrigin,
  normalizePublicOrigin,
} from "@/lib/app/publicAppOrigin";

export function resolvePassportWalletRequestOrigin(req: Request): string {
  return normalizePublicOrigin(getPublicAppOriginFromRequest(req));
}

export function isAllowedPassportWalletOrigin(origin: string): boolean {
  return isTrustedPublicAppOrigin(origin);
}

export function originsMatch(expected: string, actual: string): boolean {
  try {
    return normalizePublicOrigin(expected) === normalizePublicOrigin(actual);
  } catch {
    return false;
  }
}

/**
 * CSRF / cross-origin guard for state-changing wallet auth POSTs.
 * Binds redemption to the trusted browser origin (never a spoofed forwarded host alone).
 */
export function assertPassportWalletSameOriginRequest(req: Request, trustedOrigin: string): boolean {
  const originHeader = req.headers.get("origin")?.trim();
  if (originHeader && originHeader !== "null") {
    return originsMatch(originHeader, trustedOrigin);
  }

  const referer = req.headers.get("referer")?.trim();
  if (referer) {
    try {
      return originsMatch(new URL(referer).origin, trustedOrigin);
    } catch {
      return false;
    }
  }

  // Non-browser clients must not mint holder sessions without an Origin/Referer binding.
  return false;
}
