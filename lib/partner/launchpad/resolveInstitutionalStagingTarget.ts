// FILE: lib/partner/launchpad/resolveInstitutionalStagingTarget.ts
// Resolve authorized non-production preview URL for institutional staging certification.

import { KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS } from "@/scripts/demo/lib/knownProductionSupabaseProjectRefs";
import { resolveVercelProtectionBypass } from "@/lib/preview/vercelBypass";

const BLOCKED_HOSTS = new Set([
  "abraxas-app.vercel.app",
  "www.abraxasworld.xyz",
  "abraxasworld.xyz",
]);

/** Demo Supabase project ref for isolated staging (public hostname identifier). */
export const AUTHORIZED_DEMO_SUPABASE_PROJECT_REF = "ocntwbxarpjeixdnzide";

export interface InstitutionalStagingTarget {
  stagingUrl: string;
  expectedSupabaseRef: string;
  vercelProtectionBypass: string;
}

export type ResolveInstitutionalStagingTargetResult =
  | { ok: true; target: InstitutionalStagingTarget }
  | { ok: false; blockers: string[] };

function normalizeBaseUrl(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function resolveInstitutionalStagingTarget(
  env: NodeJS.ProcessEnv = process.env,
): ResolveInstitutionalStagingTargetResult {
  const blockers: string[] = [];

  const stagingUrl =
    normalizeBaseUrl(env.LAUNCHPAD_STAGING_URL)
    ?? normalizeBaseUrl(env.INSTITUTIONAL_SANDBOX_BASE_URL)
    ?? normalizeBaseUrl(env.PARTNER_FLOW_RP_BASE_URL);

  if (!stagingUrl) {
    blockers.push(
      "Set LAUNCHPAD_STAGING_URL or INSTITUTIONAL_SANDBOX_BASE_URL to an HTTPS Vercel preview (not production).",
    );
  } else {
    const host = new URL(stagingUrl).hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(host)) {
      blockers.push(`Staging URL targets blocked production host: ${host}`);
    }
  }

  const expectedSupabaseRef =
    env.LAUNCHPAD_EXPECTED_SUPABASE_REF?.trim() || AUTHORIZED_DEMO_SUPABASE_PROJECT_REF;

  if (KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS.includes(expectedSupabaseRef as never)) {
    blockers.push("LAUNCHPAD_EXPECTED_SUPABASE_REF must not be a known production Supabase project.");
  }

  const vercelProtectionBypass = resolveVercelProtectionBypass();
  if (!vercelProtectionBypass) {
    blockers.push(
      "Set VERCEL_PROTECTION_BYPASS when preview uses Vercel Deployment Protection (header-only; never commit).",
    );
  }

  if (blockers.length > 0) {
    return { ok: false, blockers };
  }

  return {
    ok: true,
    target: {
      stagingUrl: stagingUrl!,
      expectedSupabaseRef,
      vercelProtectionBypass,
    },
  };
}
