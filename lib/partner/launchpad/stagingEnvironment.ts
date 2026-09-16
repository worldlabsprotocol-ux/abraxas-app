// FILE: lib/partner/launchpad/stagingEnvironment.ts
// Server-only preview identity for Launchpad staging smoke tests.

import { getVercelDeploymentEnv } from "@/lib/app/publicAppOrigin";

export type LaunchpadStagingDeploymentEnvironment = "preview" | "development";

export interface LaunchpadStagingEnvironmentIdentity {
  deployment_environment: LaunchpadStagingDeploymentEnvironment;
  supabase_project_ref: string;
  commit_sha: string;
}

export type LaunchpadStagingEnvironmentResult =
  | { ok: true; identity: LaunchpadStagingEnvironmentIdentity }
  | { ok: false; reason: "not_allowed" | "unavailable" };

const SUPABASE_PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;

/** Preview deployments and explicit local test runs only — never production. */
export function isLaunchpadStagingIdentityRouteAllowed(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const vercelEnv = env.VERCEL_ENV?.trim();
  if (vercelEnv === "production") return false;
  if (vercelEnv === "preview") return true;
  if (env.LAUNCHPAD_STAGING_IDENTITY_LOCAL === "true") return true;
  if (env.NODE_ENV === "development" || env.NODE_ENV === "test") return true;
  return false;
}

export function extractSupabaseProjectRefFromConfiguredUrl(
  supabaseUrl: string | undefined,
): string | null {
  const trimmed = supabaseUrl?.trim();
  if (!trimmed) return null;

  let hostname: string;
  try {
    hostname = new URL(trimmed).hostname.toLowerCase();
  } catch {
    return null;
  }

  const match = hostname.match(/^([a-z0-9]{20})\.supabase\.co$/);
  const ref = match?.[1] ?? null;
  if (!ref || !SUPABASE_PROJECT_REF_PATTERN.test(ref)) return null;
  return ref;
}

export function resolveLaunchpadStagingEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): LaunchpadStagingEnvironmentResult {
  if (!isLaunchpadStagingIdentityRouteAllowed(env)) {
    return { ok: false, reason: "not_allowed" };
  }

  const projectRef = extractSupabaseProjectRefFromConfiguredUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  if (!projectRef) {
    return { ok: false, reason: "unavailable" };
  }

  const commitSha = env.VERCEL_GIT_COMMIT_SHA?.trim();
  if (!commitSha || !/^[0-9a-f]{7,40}$/i.test(commitSha)) {
    return { ok: false, reason: "unavailable" };
  }

  const deploymentEnvironment: LaunchpadStagingDeploymentEnvironment =
    env.VERCEL_ENV?.trim() === "preview" ? "preview" : "development";

  return {
    ok: true,
    identity: {
      deployment_environment: deploymentEnvironment,
      supabase_project_ref: projectRef,
      commit_sha: commitSha.toLowerCase(),
    },
  };
}

export function getLaunchpadStagingIdentityLogContext(
  result: LaunchpadStagingEnvironmentResult,
): Record<string, string> {
  if (!result.ok) {
    return { outcome: result.reason };
  }
  return {
    outcome: "ok",
    deployment_environment: result.identity.deployment_environment,
    supabase_project_ref: result.identity.supabase_project_ref,
    commit_sha_prefix: result.identity.commit_sha.slice(0, 7),
  };
}
