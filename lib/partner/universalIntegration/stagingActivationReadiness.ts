// FILE: lib/partner/universalIntegration/stagingActivationReadiness.ts
// Phase 1 activation readiness — no secret values in output.

import { KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS } from "@/scripts/demo/lib/knownProductionSupabaseProjectRefs";
import {
  EXAMPLE_MERCHANT_DISCLOSED_RESULT,
  EXAMPLE_MERCHANT_POLICY_PACK_ID,
} from "./exampleMerchantStagingProfile";
import { runStagingLiveE2ePreflight } from "./stagingConfigContract";

export type DependencyStatus =
  | "configured"
  | "missing"
  | "invalid"
  | "inaccessible"
  | "unverified";

export interface ActivationDependencyFinding {
  id: string;
  status: DependencyStatus;
  detail: string;
  operator_action?: string;
}

export interface StagingDeploymentProbe {
  ok: boolean;
  deployment_environment: string | null;
  supabase_project_ref: string | null;
  commit_sha_prefix: string | null;
  blocked_by_vercel_protection: boolean;
  detail: string;
}

export interface StagingActivationReadinessReport {
  generated_at: string;
  overall: "ready_to_execute" | "blocked" | "operator_setup_required";
  findings: ActivationDependencyFinding[];
  deployment_probe: StagingDeploymentProbe | null;
  policy_profile: {
    pack_id: typeof EXAMPLE_MERCHANT_POLICY_PACK_ID;
    disclosed_result: typeof EXAMPLE_MERCHANT_DISCLOSED_RESULT;
  };
  minimum_operator_actions: string[];
}

function isVercelDeploymentProtection(status: number, body: unknown, headers: Record<string, string>): boolean {
  const location = headers.location ?? headers.Location ?? "";
  if ((status === 302 || status === 307) && location.includes("vercel.com/sso-api")) {
    return true;
  }
  if (status === 401 && body && typeof body === "object") {
    const protection = (body as { protection?: { vercel_auth_enabled?: boolean } }).protection;
    if (protection?.vercel_auth_enabled) return true;
  }
  return false;
}

function validatePreviewIdentityBody(
  body: { deployment_environment?: string; supabase_project_ref?: string; commit_sha?: string },
  expectedSupabaseRef: string,
): { ok: true } | { ok: false; detail: string } {
  if (body.deployment_environment !== "preview") {
    return { ok: false, detail: `deployment_environment=${String(body.deployment_environment)}` };
  }
  if (!body.supabase_project_ref) {
    return { ok: false, detail: "supabase_project_ref missing" };
  }
  if (body.supabase_project_ref !== expectedSupabaseRef) {
    return { ok: false, detail: "supabase_project_ref mismatch" };
  }
  if (!body.commit_sha?.trim()) {
    return { ok: false, detail: "commit_sha missing" };
  }
  return { ok: true };
}

function finding(
  id: string,
  status: DependencyStatus,
  detail: string,
  operator_action?: string,
): ActivationDependencyFinding {
  return { id, status, detail, operator_action };
}

export async function probeStagingDeploymentIdentity(input: {
  baseUrl: string;
  expectedSupabaseRef?: string | null;
  vercelBypass?: string | null;
  fetch?: typeof fetch;
}): Promise<StagingDeploymentProbe> {
  const fetchFn = input.fetch ?? fetch;
  const base = input.baseUrl.replace(/\/$/, "");
  const headers: Record<string, string> = {};
  if (input.vercelBypass?.trim()) {
    headers["x-vercel-protection-bypass"] = input.vercelBypass.trim();
    headers["x-vercel-set-bypass-cookie"] = "true";
  }

  try {
    const res = await fetchFn(`${base}/api/launchpad/staging/environment`, {
      headers,
      redirect: "manual",
    });
    const body = res.ok ? await res.json().catch(() => ({})) : null;
    const headerRecord: Record<string, string> = {};
    res.headers.forEach((v, k) => { headerRecord[k] = v; });

    if (isVercelDeploymentProtection(res.status, body, headerRecord)) {
      return {
        ok: false,
        deployment_environment: null,
        supabase_project_ref: null,
        commit_sha_prefix: null,
        blocked_by_vercel_protection: true,
        detail: "Vercel deployment protection — set VERCEL_PROTECTION_BYPASS or PLAYWRIGHT_STORAGE_STATE",
      };
    }

    if (res.status === 404 || res.status === 403) {
      return {
        ok: false,
        deployment_environment: null,
        supabase_project_ref: null,
        commit_sha_prefix: null,
        blocked_by_vercel_protection: false,
        detail: `staging identity endpoint status=${res.status} (not a preview deployment or route disabled)`,
      };
    }

    if (!res.ok || !body || typeof body !== "object") {
      return {
        ok: false,
        deployment_environment: null,
        supabase_project_ref: null,
        commit_sha_prefix: null,
        blocked_by_vercel_protection: false,
        detail: `staging identity unreachable status=${res.status}`,
      };
    }

    const expected = input.expectedSupabaseRef?.trim();
    if (expected) {
      const validation = validatePreviewIdentityBody(body as {
        deployment_environment?: string;
        supabase_project_ref?: string;
        commit_sha?: string;
      }, expected);
      if (!validation.ok) {
        return {
          ok: false,
          deployment_environment: (body as { deployment_environment?: string }).deployment_environment ?? null,
          supabase_project_ref: (body as { supabase_project_ref?: string }).supabase_project_ref ?? null,
          commit_sha_prefix: ((body as { commit_sha?: string }).commit_sha ?? "").slice(0, 7) || null,
          blocked_by_vercel_protection: false,
          detail: `isolation check failed: ${validation.detail}`,
        };
      }
    }

    const ref = (body as { supabase_project_ref?: string }).supabase_project_ref ?? null;
    if (ref && KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS.includes(ref as never)) {
      return {
        ok: false,
        deployment_environment: (body as { deployment_environment?: string }).deployment_environment ?? null,
        supabase_project_ref: ref,
        commit_sha_prefix: ((body as { commit_sha?: string }).commit_sha ?? "").slice(0, 7) || null,
        blocked_by_vercel_protection: false,
        detail: "staging deployment reports production Supabase ref — abort",
      };
    }

    return {
      ok: true,
      deployment_environment: (body as { deployment_environment?: string }).deployment_environment ?? null,
      supabase_project_ref: ref,
      commit_sha_prefix: ((body as { commit_sha?: string }).commit_sha ?? "").slice(0, 7) || null,
      blocked_by_vercel_protection: false,
      detail: "preview identity confirmed",
    };
  } catch (error) {
    return {
      ok: false,
      deployment_environment: null,
      supabase_project_ref: null,
      commit_sha_prefix: null,
      blocked_by_vercel_protection: false,
      detail: error instanceof Error ? error.message : "probe_failed",
    };
  }
}

export async function buildStagingActivationReadinessReport(
  env: Record<string, string | undefined> = process.env,
  deps?: { fetch?: typeof fetch },
): Promise<StagingActivationReadinessReport> {
  const findings: ActivationDependencyFinding[] = [];
  const preflight = runStagingLiveE2ePreflight(env);

  if (!preflight.ok) {
    for (const err of preflight.errors) {
      findings.push(finding("partner_flow_rp_config", "missing", err, "Set PARTNER_FLOW_RP_* from Launchpad integration docs"));
    }
  } else {
    findings.push(finding("partner_flow_rp_config", "configured", "PARTNER_FLOW_RP preflight passed"));
  }

  const expectedRef = env.LAUNCHPAD_EXPECTED_SUPABASE_REF?.trim() ?? "";
  if (!expectedRef) {
    findings.push(finding(
      "supabase_ref_guard",
      "unverified",
      "LAUNCHPAD_EXPECTED_SUPABASE_REF not set",
      "Set demo/staging Supabase project ref before executing live proof",
    ));
  } else if (KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS.includes(expectedRef as never)) {
    findings.push(finding("supabase_ref_guard", "invalid", "Expected Supabase ref is a known production project"));
  } else {
    findings.push(finding("supabase_ref_guard", "configured", "Non-production Supabase ref declared"));
  }

  const storage = env.PLAYWRIGHT_STORAGE_STATE?.trim();
  findings.push(storage
    ? finding("test_holder_session", "configured", "Playwright storage state path declared")
    : finding(
      "test_holder_session",
      "missing",
      "No PLAYWRIGHT_STORAGE_STATE — holder auth will require manual checkpoint",
      "Complete holder sign-in once; save storage state locally",
    ));

  const executeLive = env.EXAMPLE_MERCHANT_EXECUTE_LIVE?.trim() === "1";
  findings.push(finding(
    "live_execution_gate",
    executeLive ? "configured" : "unverified",
    executeLive ? "EXAMPLE_MERCHANT_EXECUTE_LIVE=1" : "Dry-run readiness only (set EXAMPLE_MERCHANT_EXECUTE_LIVE=1 to run Playwright)",
  ));

  let deployment_probe: StagingDeploymentProbe | null = null;
  const baseUrl = preflight.config?.rp.baseUrl ?? env.PARTNER_FLOW_RP_BASE_URL?.trim() ?? env.LAUNCHPAD_STAGING_URL?.trim();
  if (baseUrl) {
    deployment_probe = await probeStagingDeploymentIdentity({
      baseUrl,
      expectedSupabaseRef: expectedRef || null,
      vercelBypass: env.VERCEL_PROTECTION_BYPASS,
      fetch: deps?.fetch,
    });
    findings.push(deployment_probe.ok
      ? finding("staging_deployment_isolation", "configured", deployment_probe.detail)
      : finding(
        "staging_deployment_isolation",
        deployment_probe.blocked_by_vercel_protection ? "inaccessible" : "unverified",
        deployment_probe.detail,
        deployment_probe.blocked_by_vercel_protection
          ? "Provide VERCEL_PROTECTION_BYPASS from Vercel project settings"
          : "Deploy preview bound to demo Supabase; verify /api/launchpad/staging/environment",
      ));
  } else {
    findings.push(finding(
      "staging_deployment_isolation",
      "missing",
      "No staging base URL to probe",
      "Set PARTNER_FLOW_RP_BASE_URL or LAUNCHPAD_STAGING_URL",
    ));
  }

  const blocked = findings.some((f) => f.status === "invalid" || f.status === "missing")
    || (deployment_probe !== null && !deployment_probe.ok && expectedRef.length > 0);
  const operatorSetup = findings.some((f) => f.status === "missing" || f.status === "unverified");

  let overall: StagingActivationReadinessReport["overall"] = "ready_to_execute";
  if (blocked) overall = "blocked";
  else if (operatorSetup) overall = "operator_setup_required";

  return {
    generated_at: new Date().toISOString(),
    overall,
    findings,
    deployment_probe,
    policy_profile: {
      pack_id: EXAMPLE_MERCHANT_POLICY_PACK_ID,
      disclosed_result: EXAMPLE_MERCHANT_DISCLOSED_RESULT,
    },
    minimum_operator_actions: findings
      .filter((f) => f.operator_action)
      .map((f) => f.operator_action!) ,
  };
}
