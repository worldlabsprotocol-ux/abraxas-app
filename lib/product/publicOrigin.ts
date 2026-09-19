// FILE: lib/product/publicOrigin.ts
// Public product vs public DEMO origin helpers. Never leak operator runbooks on production.

export const PUBLIC_PRODUCT_HOSTS = new Set([
  "abraxasworld.xyz",
  "www.abraxasworld.xyz",
]);

export const PUBLIC_DEMO_HOST = "demo.abraxasworld.xyz";
export const PUBLIC_DEMO_ORIGIN = `https://${PUBLIC_DEMO_HOST}`;

export const PUBLIC_SURFACE_REDIRECTS = [
  { source: "/partner", destination: "/docs/partner-flow" },
  { source: "/onboarding", destination: "/design-partner" },
] as const;

export const ACCOUNT_ACCESS_FIRST_PAINT =
  "Google sign-in opens an account only. Eligibility is a result defined by each partner policy. Identity or liveness appears only when a policy truly requires it.";

export function isPublicDemoRuntime(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.ABRAXAS_RUNTIME_ENV?.trim() === "demo";
}

export function isPublicProductProduction(
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (isPublicDemoRuntime(env)) return false;
  return env.VERCEL_ENV === "production" || env.ABRAXAS_RUNTIME_ENV === "production";
}

function normalizeHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const first = host.split(",")[0]?.trim().toLowerCase() ?? "";
  if (!first) return null;
  return first.replace(/:\d+$/, "");
}

export function requestHostname(request: { headers: Headers } | null | undefined): string | null {
  if (!request) return null;
  return normalizeHost(request.headers.get("x-forwarded-host"))
    || normalizeHost(request.headers.get("host"));
}

export function isPublicProductRequestHost(
  request: { headers: Headers } | null | undefined,
): boolean {
  const host = requestHostname(request);
  return Boolean(host && PUBLIC_PRODUCT_HOSTS.has(host));
}
