// FILE: lib/app/publicAppOrigin.ts
// Canonical browser-facing app origin — same host for session cookies and partner redirects.

import { SITE_URL } from "@/lib/siteUrl";

/**
 * Default base URL for server SDKs and integrator examples.
 * Respects NEXT_PUBLIC_APP_URL, ABRAXAS_ISSUER_URL, and VERCEL_URL for preview/local;
 * falls back to canonical production origin (SITE_URL).
 */
export function getSdkDefaultBaseUrl(): string {
  const fromPublic = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromPublic) return fromPublic.replace(/\/$/, "");

  const fromIssuer = process.env.ABRAXAS_ISSUER_URL?.trim();
  if (fromIssuer) return fromIssuer.replace(/\/$/, "");

  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) return `https://${vercelHost.replace(/\/$/, "")}`;

  return SITE_URL;
}

/**
 * Resolve the public app origin for links and return URLs.
 * Client: current page origin (same-origin partner flow).
 * Server: NEXT_PUBLIC_APP_URL → ABRAXAS_ISSUER_URL → VERCEL_URL → localhost.
 */
export function getPublicAppOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const fromPublic = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromPublic) return fromPublic.replace(/\/$/, "");

  const fromIssuer = process.env.ABRAXAS_ISSUER_URL?.trim();
  if (fromIssuer) return fromIssuer.replace(/\/$/, "");

  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) return `https://${vercelHost.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

/** Configured browser-facing origins we may reflect from an incoming request host. */
function getTrustedPublicAppOrigins(): string[] {
  const origins: string[] = [SITE_URL];

  const fromPublic = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromPublic) origins.push(normalizeOrigin(fromPublic));

  const fromIssuer = process.env.ABRAXAS_ISSUER_URL?.trim();
  if (fromIssuer) origins.push(normalizeOrigin(fromIssuer));

  const vercelHost = process.env.VERCEL_URL?.trim();
  if (vercelHost) origins.push(`https://${normalizeOrigin(vercelHost)}`);

  origins.push("http://localhost:3000");

  return Array.from(new Set(origins));
}

function hostHeaderMatchesOrigin(hostHeader: string, origin: string): boolean {
  try {
    const originUrl = new URL(origin);
    const defaultPort = originUrl.protocol === "https:" ? "443" : "80";
    const originHostname = originUrl.hostname.toLowerCase();
    const originPort = originUrl.port || defaultPort;

    const hostLower = hostHeader.trim().toLowerCase();
    if (!hostLower) return false;

    if (hostLower.includes(":")) {
      const colon = hostLower.lastIndexOf(":");
      const hostname = hostLower.slice(0, colon);
      const port = hostLower.slice(colon + 1);
      return hostname === originHostname && port === originPort;
    }

    return hostLower === originHostname && originPort === defaultPort;
  } catch {
    return false;
  }
}

function resolveTrustedOriginForHost(hostHeader: string): string | null {
  for (const origin of getTrustedPublicAppOrigins()) {
    if (hostHeaderMatchesOrigin(hostHeader, origin)) {
      return origin;
    }
  }
  return null;
}

/**
 * Prefer the incoming request host when it matches a configured trusted origin.
 * Never constructs an origin from untrusted x-forwarded-host or x-forwarded-proto.
 */
export function getPublicAppOriginFromRequest(request: {
  headers: Headers;
}): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = request.headers.get("host");

  const candidates = [
    forwardedHost?.split(",")[0]?.trim(),
    hostHeader?.split(",")[0]?.trim(),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const trusted = resolveTrustedOriginForHost(candidate);
    if (trusted) return trusted;
  }

  return getPublicAppOrigin();
}

/**
 * Resolve app origin for server-generated protocol URLs (Verify, Connect, OpenID4VP).
 * Prefer request-derived origin when callers pass it; otherwise SDK/env default (SITE_URL in prod).
 */
export function resolveProtocolAppOrigin(appOrigin?: string): string {
  return (appOrigin ?? getSdkDefaultBaseUrl()).replace(/\/$/, "");
}
