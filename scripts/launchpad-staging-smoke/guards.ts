// FILE: scripts/launchpad-staging-smoke/guards.ts
// Fail-closed guards for Partner Launchpad staging smoke tests.

import { KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS } from "../demo/lib/knownProductionSupabaseProjectRefs";

const BLOCKED_HOSTS = new Set([
  "abraxas-app.vercel.app",
  "www.abraxasworld.xyz",
  "abraxasworld.xyz",
]);

export interface StagingTargetConfig {
  targetUrl: string;
  expectedSupabaseRef: string;
  vercelProtectionBypass?: string;
  adminPin?: string;
  storageStatePath?: string;
}

export function parseStagingTargetFromEnv(): StagingTargetConfig {
  const targetUrl = process.env.LAUNCHPAD_STAGING_URL?.trim();
  const expectedSupabaseRef = process.env.LAUNCHPAD_EXPECTED_SUPABASE_REF?.trim();
  const vercelProtectionBypass = process.env.VERCEL_PROTECTION_BYPASS?.trim();
  const adminPin = process.env.LAUNCHPAD_ADMIN_PIN?.trim();
  const storageStatePath = process.env.PLAYWRIGHT_STORAGE_STATE?.trim();

  const errors: string[] = [];
  if (!targetUrl) errors.push("LAUNCHPAD_STAGING_URL is required");
  if (!expectedSupabaseRef) errors.push("LAUNCHPAD_EXPECTED_SUPABASE_REF is required");

  if (targetUrl) {
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      errors.push("LAUNCHPAD_STAGING_URL must be a valid URL");
      parsed = new URL("https://invalid");
    }

    if (parsed.protocol !== "https:") {
      errors.push("LAUNCHPAD_STAGING_URL must use HTTPS");
    }

    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(host)) {
      errors.push(`LAUNCHPAD_STAGING_URL appears to target production host: ${host}`);
    }
  }

  if (expectedSupabaseRef) {
    if (KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS.includes(expectedSupabaseRef as never)) {
      errors.push("LAUNCHPAD_EXPECTED_SUPABASE_REF must not be a known production Supabase project");
    }
  }

  if (errors.length > 0) {
    throw new Error(`Launchpad staging smoke preflight failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }

  return {
    targetUrl: targetUrl!.replace(/\/$/, ""),
    expectedSupabaseRef: expectedSupabaseRef!,
    vercelProtectionBypass,
    adminPin,
    storageStatePath,
  };
}

export function extractSupabaseProjectRef(text: string): string | null {
  const match = text.match(/https:\/\/([a-z0-9]{20})\.supabase\.co/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function isVercelSsoRedirect(responseUrl: string): boolean {
  return responseUrl.includes("vercel.com/sso-api");
}

export function isVercelDeploymentProtection(status: number, body: unknown, headers: Record<string, string>): boolean {
  const location = headers.location ?? headers.Location ?? "";
  if ((status === 302 || status === 307) && isVercelSsoRedirect(location)) {
    return true;
  }
  if (status === 401 && body && typeof body === "object") {
    const protection = (body as { protection?: { vercel_auth_enabled?: boolean } }).protection;
    if (protection?.vercel_auth_enabled) return true;
    const callback = (body as { protection?: { vercel_auth_callback?: string } }).protection?.vercel_auth_callback;
    if (callback && isVercelSsoRedirect(callback)) return true;
  }
  return false;
}
