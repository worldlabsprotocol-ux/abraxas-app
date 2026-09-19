// FILE: lib/judgeDemo/contract.ts
// Fail-closed Judge Demo runtime. Public origin + DEMO Supabase only. No secrets in output.

import { DEMO_SANDBOX_APP_ORIGIN } from "@/lib/demo/partnerSandboxDemoEnvironmentGuard";
import { auditRuntimeSupabaseBinding } from "@/lib/supabase/runtimeSupabaseBinding";
import { DEMO_SUPABASE_PROJECT_REF } from "@/lib/supabase/projectRefs";

export const JUDGE_DEMO_ORIGIN = DEMO_SANDBOX_APP_ORIGIN;
export const JUDGE_DEMO_OAUTH_CALLBACK_PATH = "/auth/zklogin/callback";
export const JUDGE_DEMO_OAUTH_CALLBACK = `${JUDGE_DEMO_ORIGIN}${JUDGE_DEMO_OAUTH_CALLBACK_PATH}`;
export const JUDGE_DEMO_FLAG_ENV = "ABRAXAS_JUDGE_DEMO";
export const JUDGE_DEMO_PUBLIC_FLAG_ENV = "NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO";
export const JUDGE_DEMO_RUNTIME_MARKER = "demo";

export const JUDGE_DEMO_VISIBLE_PATHS = [
  "/",
  "/passport",
  "/good-trouble",
  "/docs/partner-flow",
  "/docs/policy-packs",
  "/docs/integration-kit",
  "/developers/launchpad",
  "/docs/circle-arc-testnet",
] as const;

export type JudgeDemoFailCode =
  | "judge_demo_not_enabled"
  | "judge_demo_public_flag_mismatch"
  | "judge_demo_origin_mismatch"
  | "judge_demo_unexpected_host"
  | "judge_demo_runtime_not_demo"
  | "judge_demo_production_runtime"
  | "judge_demo_production_vercel"
  | "judge_demo_supabase_not_demo"
  | "judge_demo_production_supabase"
  | "judge_demo_live_circle_credentials"
  | "judge_demo_missing_binding";

export type JudgeDemoContractEvaluation = {
  requested: boolean;
  ok: boolean;
  public: boolean;
  origin: typeof JUDGE_DEMO_ORIGIN;
  oauth_callback: typeof JUDGE_DEMO_OAUTH_CALLBACK;
  vercel_env: string | null;
  runtime_env: string | null;
  runtime_marker_non_production: boolean;
  supabase_project_ref: string;
  supabase_bound_to_demo: boolean;
  production_ref_detected: boolean;
  circle_submit_allowed: false;
  engineering_preview_only: false;
  sso_not_required_on_custom_domain: true;
  deployment_sha: string | null;
  fail_codes: JudgeDemoFailCode[];
};

function envRecord(env: Record<string, string | undefined> = process.env) {
  return env;
}

export function isJudgeDemoRequested(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env[JUDGE_DEMO_FLAG_ENV]?.trim() === "true"
    || env[JUDGE_DEMO_PUBLIC_FLAG_ENV]?.trim() === "true";
}

export function isJudgeDemoClientPinned(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env[JUDGE_DEMO_PUBLIC_FLAG_ENV]?.trim() === "true";
}

function normalizeHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const first = host.split(",")[0]?.trim().toLowerCase() ?? "";
  if (!first) return null;
  return first.replace(/:\d+$/, "");
}

export function evaluateJudgeDemoRequestHost(
  request: { headers: Headers } | null | undefined,
): { ok: boolean; host: string | null } {
  if (!request) return { ok: true, host: null };
  const forwarded = normalizeHost(request.headers.get("x-forwarded-host"));
  const host = normalizeHost(request.headers.get("host"));
  const observed = forwarded || host;
  if (!observed) return { ok: false, host: null };
  try {
    const expected = new URL(JUDGE_DEMO_ORIGIN).hostname.toLowerCase();
    return { ok: observed === expected, host: observed };
  } catch {
    return { ok: false, host: observed };
  }
}

function isLiveCircleApiKey(value: string | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  return trimmed.startsWith("LIVE_API_KEY:") || trimmed.includes("LIVE_API_KEY:");
}

export function evaluateJudgeDemoContract(input?: {
  env?: Record<string, string | undefined>;
  request?: { headers: Headers } | null;
}): JudgeDemoContractEvaluation {
  const env = envRecord(input?.env);
  const requested = isJudgeDemoRequested(env);
  const serverFlag = env[JUDGE_DEMO_FLAG_ENV]?.trim() === "true";
  const publicFlag = env[JUDGE_DEMO_PUBLIC_FLAG_ENV]?.trim() === "true";
  const vercelEnv = env.VERCEL_ENV?.trim() || null;
  const runtimeEnv = env.ABRAXAS_RUNTIME_ENV?.trim() || null;
  const configuredOrigin = (env.NEXT_PUBLIC_APP_URL?.trim() || env.ABRAXAS_ISSUER_URL?.trim() || "")
    .replace(/\/$/, "");
  const audit = auditRuntimeSupabaseBinding({
    url: env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  });
  const hostCheck = evaluateJudgeDemoRequestHost(input?.request ?? null);
  const fail_codes: JudgeDemoFailCode[] = [];

  if (!requested) {
    fail_codes.push("judge_demo_not_enabled");
  } else {
    if (serverFlag !== publicFlag) fail_codes.push("judge_demo_public_flag_mismatch");
    if (configuredOrigin !== JUDGE_DEMO_ORIGIN) fail_codes.push("judge_demo_origin_mismatch");
    if (input?.request && !hostCheck.ok) fail_codes.push("judge_demo_unexpected_host");
    if (runtimeEnv !== JUDGE_DEMO_RUNTIME_MARKER) fail_codes.push("judge_demo_runtime_not_demo");
    if (runtimeEnv === "production") fail_codes.push("judge_demo_production_runtime");
    if (vercelEnv === "production") fail_codes.push("judge_demo_production_vercel");
    if (audit.production_ref_detected) fail_codes.push("judge_demo_production_supabase");
    if (!audit.all_match_demo) fail_codes.push("judge_demo_supabase_not_demo");
    if (audit.missing.length > 0) fail_codes.push("judge_demo_missing_binding");
    if (isLiveCircleApiKey(env.CIRCLE_API_KEY)) fail_codes.push("judge_demo_live_circle_credentials");
  }

  const ok = requested && fail_codes.length === 0;
  return {
    requested,
    ok,
    public: true,
    origin: JUDGE_DEMO_ORIGIN,
    oauth_callback: JUDGE_DEMO_OAUTH_CALLBACK,
    vercel_env: vercelEnv,
    runtime_env: runtimeEnv,
    runtime_marker_non_production: runtimeEnv === JUDGE_DEMO_RUNTIME_MARKER && vercelEnv !== "production",
    supabase_project_ref: DEMO_SUPABASE_PROJECT_REF,
    supabase_bound_to_demo: audit.all_match_demo && !audit.production_ref_detected,
    production_ref_detected: audit.production_ref_detected,
    circle_submit_allowed: false,
    engineering_preview_only: false,
    sso_not_required_on_custom_domain: true,
    deployment_sha: env.VERCEL_GIT_COMMIT_SHA?.trim() || null,
    fail_codes,
  };
}

export function toPublicJudgeDemoIdentity(evaluation: JudgeDemoContractEvaluation): Record<string, unknown> {
  return {
    judge_demo: evaluation.requested,
    ok: evaluation.ok,
    public: evaluation.public,
    origin: evaluation.origin,
    oauth_callback: evaluation.oauth_callback,
    vercel_env: evaluation.vercel_env,
    runtime_env: evaluation.runtime_env,
    runtime_marker_non_production: evaluation.runtime_marker_non_production,
    supabase_project_ref: evaluation.supabase_project_ref,
    supabase_bound_to_demo: evaluation.supabase_bound_to_demo,
    production_ref_detected: evaluation.production_ref_detected,
    circle_submit_allowed: evaluation.circle_submit_allowed,
    engineering_preview_only: evaluation.engineering_preview_only,
    sso_not_required_on_custom_domain: evaluation.sso_not_required_on_custom_domain,
    deployment_sha: evaluation.deployment_sha,
    visible_paths: JUDGE_DEMO_VISIBLE_PATHS,
    fail_codes: evaluation.ok ? [] : evaluation.fail_codes,
  };
}

const FORBIDDEN_IDENTITY_NEEDLES = [
  "service_role",
  "anon_key",
  "eyJ",
  "secret",
  "api_key",
  "entity_secret",
  "wallet_id",
  "private_key",
  "password",
  "authorization",
] as const;

export function judgeDemoIdentityHasForbiddenMaterial(payload: unknown): boolean {
  const blob = JSON.stringify(payload).toLowerCase();
  return FORBIDDEN_IDENTITY_NEEDLES.some((needle) => blob.includes(needle.toLowerCase()));
}

export function assertJudgeDemoBootContract(
  env: Record<string, string | undefined> = process.env,
): void {
  if (!isJudgeDemoRequested(env)) return;
  const evaluation = evaluateJudgeDemoContract({ env });
  if (evaluation.ok) return;
  throw new Error(
    `Judge Demo runtime failed closed: ${evaluation.fail_codes.join(",")}`,
  );
}
