// FILE: lib/app/publicAppOrigin.ts
// Canonical browser-facing app origin — same host for session cookies and partner redirects.

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

/** Prefer the incoming request host so API-generated URLs match the browser origin. */
export function getPublicAppOriginFromRequest(request: {
  headers: Headers;
}): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = (forwardedHost ?? request.headers.get("host") ?? "").split(",")[0]?.trim();
  if (host) {
    const proto = (request.headers.get("x-forwarded-proto") ?? "https").split(",")[0]?.trim();
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  return getPublicAppOrigin();
}
