// FILE: scripts/launchpad-staging-smoke/identity.ts

import type { LaunchpadStagingClient } from "./client";
import type { StagingTargetConfig } from "./guards";
import { isVercelDeploymentProtection } from "./guards";
import { redactSensitiveText } from "./redact";

export interface PreviewIdentityVerification {
  ok: boolean;
  blockedByVercelSso: boolean;
  detectedSupabaseRef: string | null;
  detectedDeploymentEnvironment: string | null;
  detectedCommitSha: string | null;
  detail: string;
}

export interface PreviewIdentityBody {
  deployment_environment?: string;
  supabase_project_ref?: string;
  commit_sha?: string;
}

export function validatePreviewIdentityBody(
  body: PreviewIdentityBody,
  expectedSupabaseRef: string,
): { ok: true; identity: PreviewIdentityBody & { commit_sha: string; supabase_project_ref: string; deployment_environment: string } } | { ok: false; detail: string } {
  if (body.deployment_environment !== "preview") {
    return { ok: false, detail: `deployment_environment=${String(body.deployment_environment)}` };
  }
  if (!body.supabase_project_ref) {
    return { ok: false, detail: "supabase_project_ref missing" };
  }
  if (body.supabase_project_ref !== expectedSupabaseRef) {
    return { ok: false, detail: `supabase_project_ref mismatch observed=${body.supabase_project_ref}` };
  }
  if (!body.commit_sha?.trim()) {
    return { ok: false, detail: "commit_sha missing" };
  }
  return {
    ok: true,
    identity: {
      deployment_environment: body.deployment_environment,
      supabase_project_ref: body.supabase_project_ref,
      commit_sha: body.commit_sha,
    },
  };
}

export async function verifyPreviewIdentity(
  client: LaunchpadStagingClient,
  config: StagingTargetConfig,
): Promise<PreviewIdentityVerification> {
  const res = await client.getJson(
    "/api/launchpad/staging/environment?supabase_project_ref=attacker-controlled",
  );

  if (isVercelDeploymentProtection(res.status, res.body, res.headers)) {
    return {
      ok: false,
      blockedByVercelSso: true,
      detectedSupabaseRef: null,
      detectedDeploymentEnvironment: null,
      detectedCommitSha: null,
      detail: "Vercel deployment protection active",
    };
  }

  if (res.status !== 200) {
    return {
      ok: false,
      blockedByVercelSso: false,
      detectedSupabaseRef: null,
      detectedDeploymentEnvironment: null,
      detectedCommitSha: null,
      detail: `identity endpoint status=${res.status}`,
    };
  }

  const body = (res.body ?? {}) as PreviewIdentityBody;
  const validation = validatePreviewIdentityBody(body, config.expectedSupabaseRef);
  if (!validation.ok) {
    return {
      ok: false,
      blockedByVercelSso: false,
      detectedSupabaseRef: body.supabase_project_ref ?? null,
      detectedDeploymentEnvironment: body.deployment_environment ?? null,
      detectedCommitSha: body.commit_sha ?? null,
      detail: validation.detail,
    };
  }

  const cacheControl = res.headers["cache-control"] ?? res.headers["Cache-Control"] ?? "";
  if (!cacheControl.includes("no-store")) {
    return {
      ok: false,
      blockedByVercelSso: false,
      detectedSupabaseRef: validation.identity.supabase_project_ref,
      detectedDeploymentEnvironment: validation.identity.deployment_environment,
      detectedCommitSha: validation.identity.commit_sha,
      detail: "identity response missing Cache-Control: no-store",
    };
  }

  const serialized = JSON.stringify(res.body);
  if (serialized.match(/service_role|SUPABASE_SERVICE_ROLE|postgresql:\/\//i)) {
    return {
      ok: false,
      blockedByVercelSso: false,
      detectedSupabaseRef: validation.identity.supabase_project_ref,
      detectedDeploymentEnvironment: validation.identity.deployment_environment,
      detectedCommitSha: validation.identity.commit_sha,
      detail: "identity response leaked sensitive configuration",
    };
  }

  return {
    ok: true,
    blockedByVercelSso: false,
    detectedSupabaseRef: validation.identity.supabase_project_ref,
    detectedDeploymentEnvironment: validation.identity.deployment_environment,
    detectedCommitSha: validation.identity.commit_sha,
    detail: redactSensitiveText(
      `deployment_environment=${validation.identity.deployment_environment} commit_sha=${validation.identity.commit_sha.slice(0, 7)}`,
    ),
  };
}
