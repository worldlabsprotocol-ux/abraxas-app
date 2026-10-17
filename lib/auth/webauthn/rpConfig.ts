// FILE: lib/auth/webauthn/rpConfig.ts

import { SITE_URL } from "@/lib/siteUrl";

export function resolveWebAuthnRpId(hostHeader?: string | null): string {
  const fromEnv = process.env.ABRAXAS_WEBAUTHN_RP_ID?.trim();
  if (fromEnv) return fromEnv;
  if (hostHeader) {
    const host = hostHeader.split(":")[0]?.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return "localhost";
    if (host) return host;
  }
  try {
    const url = new URL(SITE_URL);
    return url.hostname;
  } catch {
    return "localhost";
  }
}

export function resolveWebAuthnOrigin(reqOrigin: string | null, hostHeader?: string | null): string | null {
  if (reqOrigin) return reqOrigin;
  if (hostHeader) {
    const proto = process.env.NODE_ENV === "production" ? "https" : "http";
    return `${proto}://${hostHeader}`;
  }
  try {
    return new URL(SITE_URL).origin;
  } catch {
    return null;
  }
}

export const WEBAUTHN_RP_NAME = "Abraxas";

export const WEBAUTHN_CHALLENGE_TTL_SEC = 120;
