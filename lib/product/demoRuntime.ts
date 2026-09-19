// FILE: lib/product/demoRuntime.ts
// DEMO is the same public product with isolated data. Bound by origin/runtime, not a judge flag.

import { PUBLIC_DEMO_HOST, PUBLIC_DEMO_ORIGIN, PUBLIC_PRODUCT_HOSTS } from "@/lib/product/publicOrigin";
import { auditRuntimeSupabaseBinding } from "@/lib/supabase/runtimeSupabaseBinding";
import { DEMO_SUPABASE_PROJECT_REF } from "@/lib/supabase/projectRefs";

export const DEMO_OAUTH_CALLBACK_PATH = "/auth/zklogin/callback";
export const DEMO_OAUTH_CALLBACK = `${PUBLIC_DEMO_ORIGIN}${DEMO_OAUTH_CALLBACK_PATH}`;

export const OBSOLETE_JUDGE_DEMO_ENV_NAMES = [
  "ABRAXAS_JUDGE_DEMO",
  "NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO",
] as const;

export class DemoRuntimeUnavailableError extends Error {
  readonly code = "demo_runtime_unavailable";
  readonly fail_codes: DemoRuntimeFailCode[];

  constructor(failCodes: DemoRuntimeFailCode[]) {
    super("demo_runtime_unavailable");
    this.name = "DemoRuntimeUnavailableError";
    this.fail_codes = failCodes;
  }
}

export type DemoRuntimeFailCode =
  | "demo_origin_mismatch"
  | "demo_unexpected_host"
  | "demo_runtime_not_demo"
  | "demo_production_runtime"
  | "demo_production_vercel"
  | "demo_supabase_not_demo"
  | "demo_production_supabase"
  | "demo_live_circle_credentials"
  | "demo_missing_binding";

export type DemoRuntimeEvaluation = {
  bound: boolean;
  ok: boolean;
  origin: typeof PUBLIC_DEMO_ORIGIN;
  oauth_callback: typeof DEMO_OAUTH_CALLBACK;
  vercel_env: string | null;
  runtime_env: string | null;
  supabase_project_ref: string;
  supabase_bound_to_demo: boolean;
  production_ref_detected: boolean;
  circle_requires_explicit_confirmation: true;
  fail_codes: DemoRuntimeFailCode[];
};

function normalizeHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const first = host.split(",")[0]?.trim().toLowerCase() ?? "";
  if (!first) return null;
  return first.replace(/:\d+$/, "");
}

export function isPublicDemoHost(host: string | null | undefined): boolean {
  return normalizeHost(host) === PUBLIC_DEMO_HOST;
}

export function isPublicDemoRuntime(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.ABRAXAS_RUNTIME_ENV?.trim() === "demo";
}

export function isPublicDemoClientSurface(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const appUrl = (env.NEXT_PUBLIC_APP_URL ?? "").toLowerCase();
  return appUrl.includes(PUBLIC_DEMO_HOST);
}

function isLiveCircleApiKey(value: string | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  return trimmed.startsWith("LIVE_API_KEY:") || trimmed.includes("LIVE_API_KEY:");
}

export function evaluateDemoRequestHost(
  request: { headers: Headers } | null | undefined,
): { ok: boolean; host: string | null } {
  if (!request) return { ok: true, host: null };
  const observed = normalizeHost(request.headers.get("x-forwarded-host"))
    || normalizeHost(request.headers.get("host"));
  if (!observed) return { ok: false, host: null };
  return { ok: observed === PUBLIC_DEMO_HOST, host: observed };
}

export function evaluateDemoRuntime(input?: {
  env?: Record<string, string | undefined>;
  request?: { headers: Headers } | null;
}): DemoRuntimeEvaluation {
  const env = input?.env ?? process.env;
  const bound = isPublicDemoRuntime(env);
  const vercelEnv = env.VERCEL_ENV?.trim() || null;
  const runtimeEnv = env.ABRAXAS_RUNTIME_ENV?.trim() || null;
  const configuredOrigin = (env.NEXT_PUBLIC_APP_URL?.trim() || env.ABRAXAS_ISSUER_URL?.trim() || "")
    .replace(/\/$/, "");
  const audit = auditRuntimeSupabaseBinding({
    url: env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  });
  const hostCheck = evaluateDemoRequestHost(input?.request ?? null);
  const fail_codes: DemoRuntimeFailCode[] = [];
  const supabaseBoundToDemo = isDemoSupabaseBinding(audit);

  if (bound) {
    if (!isConfiguredDemoOrigin(configuredOrigin)) fail_codes.push("demo_origin_mismatch");
    if (input?.request && !hostCheck.ok) fail_codes.push("demo_unexpected_host");
    if (runtimeEnv && runtimeEnv !== "demo") fail_codes.push("demo_runtime_not_demo");
    if (runtimeEnv === "production") fail_codes.push("demo_production_runtime");
    if (vercelEnv === "production" && configuredOriginHostIsPublicProduct(configuredOrigin)) {
      fail_codes.push("demo_production_vercel");
    }
    if (audit.production_ref_detected) fail_codes.push("demo_production_supabase");
    if (!supabaseBoundToDemo && audit.missing.length === 0 && !audit.production_ref_detected) {
      fail_codes.push("demo_supabase_not_demo");
    }
    if (audit.missing.length > 0) fail_codes.push("demo_missing_binding");
    if (isLiveCircleApiKey(env.CIRCLE_API_KEY)) fail_codes.push("demo_live_circle_credentials");
  }

  return {
    bound,
    ok: bound && fail_codes.length === 0,
    origin: PUBLIC_DEMO_ORIGIN,
    oauth_callback: DEMO_OAUTH_CALLBACK,
    vercel_env: vercelEnv,
    runtime_env: runtimeEnv,
    supabase_project_ref: DEMO_SUPABASE_PROJECT_REF,
    supabase_bound_to_demo: supabaseBoundToDemo,
    production_ref_detected: audit.production_ref_detected,
    circle_requires_explicit_confirmation: true,
    fail_codes,
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

export function demoIdentityHasForbiddenMaterial(payload: unknown): boolean {
  const blob = JSON.stringify(payload).toLowerCase();
  return FORBIDDEN_IDENTITY_NEEDLES.some((needle) => blob.includes(needle.toLowerCase()));
}

export function assertDemoRuntimeBoot(
  env: Record<string, string | undefined> = process.env,
): void {
  if (!isPublicDemoRuntime(env)) return;
  const evaluation = evaluateDemoRuntime({ env });
  if (evaluation.ok) return;
  throw new DemoRuntimeUnavailableError(evaluation.fail_codes);
}

function configuredOriginHostIsPublicProduct(origin: string): boolean {
  try {
    const host = new URL(origin.includes("://") ? origin : `https://${origin}`).hostname.toLowerCase();
    return PUBLIC_PRODUCT_HOSTS.has(host);
  } catch {
    return false;
  }
}

function isConfiguredDemoOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin.includes("://") ? origin : `https://${origin}`);
    return parsed.protocol === "https:" && parsed.hostname.toLowerCase() === PUBLIC_DEMO_HOST;
  } catch {
    return false;
  }
}

function isDemoSupabaseBinding(audit: {
  url_matches_demo: boolean;
  missing: string[];
  production_ref_detected: boolean;
  anon_key_project_ref: string | null;
  service_role_key_project_ref: string | null;
  anon_key_matches_demo: boolean;
  service_role_matches_demo: boolean;
}): boolean {
  if (!audit.url_matches_demo || audit.missing.length > 0 || audit.production_ref_detected) return false;
  if (audit.anon_key_project_ref && !audit.anon_key_matches_demo) return false;
  if (audit.service_role_key_project_ref && !audit.service_role_matches_demo) return false;
  return true;
}
