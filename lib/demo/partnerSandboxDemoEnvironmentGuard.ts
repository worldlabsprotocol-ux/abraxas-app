// FILE: lib/demo/partnerSandboxDemoEnvironmentGuard.ts
// Fail-closed origin gate for Partner Sandbox Demo — uses configured env only (never request Host).

import { SITE_URL } from "@/lib/siteUrl";

export const DEMO_SANDBOX_APP_ORIGIN = "https://demo.abraxasworld.xyz";

const LOCAL_DEV_HOSTNAMES = new Set(["localhost", "127.0.0.1"]);

export type PartnerSandboxDemoOriginGateReason =
  | "production_origin"
  | "invalid_origin"
  | "origin_not_configured"
  | "origin_not_demo";

export type PartnerSandboxDemoOriginGateResult =
  | { allowed: true; origin: string }
  | { allowed: false; reason: PartnerSandboxDemoOriginGateReason };

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, "");
}

function parseAppOrigin(origin: string): URL | null {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Resolve the deployment's configured app origin from trusted env vars only.
 * Precedence matches server-side publicAppOrigin: NEXT_PUBLIC_APP_URL, then ABRAXAS_ISSUER_URL.
 * Local development/test without either var falls back to localhost (never SITE_URL).
 */
export function resolveConfiguredAppOrigin(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const fromPublic = env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromPublic) {
    return normalizeOrigin(fromPublic);
  }

  const fromIssuer = env.ABRAXAS_ISSUER_URL?.trim();
  if (fromIssuer) {
    return normalizeOrigin(fromIssuer);
  }

  const nodeEnv = env.NODE_ENV?.trim();
  if (nodeEnv === "development" || nodeEnv === "test") {
    return "http://localhost:3000";
  }

  return null;
}

export function isProductionAppOrigin(origin: string): boolean {
  return normalizeOrigin(origin).toLowerCase() === normalizeOrigin(SITE_URL).toLowerCase();
}

export function isLocalDevAppOrigin(origin: string): boolean {
  const parsed = parseAppOrigin(origin);
  if (!parsed) {
    return false;
  }
  return LOCAL_DEV_HOSTNAMES.has(parsed.hostname.toLowerCase());
}

export function isDemoSandboxAppOrigin(origin: string): boolean {
  const parsed = parseAppOrigin(origin);
  if (!parsed) {
    return false;
  }
  return parsed.origin.toLowerCase() === normalizeOrigin(DEMO_SANDBOX_APP_ORIGIN).toLowerCase();
}

export function evaluatePartnerSandboxDemoOriginGate(
  env: Record<string, string | undefined> = process.env,
): PartnerSandboxDemoOriginGateResult {
  const configured = resolveConfiguredAppOrigin(env);
  if (!configured) {
    return { allowed: false, reason: "origin_not_configured" };
  }

  const parsed = parseAppOrigin(configured);
  if (!parsed) {
    return { allowed: false, reason: "invalid_origin" };
  }

  if (isProductionAppOrigin(configured)) {
    return { allowed: false, reason: "production_origin" };
  }

  if (isDemoSandboxAppOrigin(configured) || isLocalDevAppOrigin(configured)) {
    return { allowed: true, origin: parsed.origin };
  }

  return { allowed: false, reason: "origin_not_demo" };
}

export function isPartnerSandboxDemoOriginAllowed(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return evaluatePartnerSandboxDemoOriginGate(env).allowed;
}
