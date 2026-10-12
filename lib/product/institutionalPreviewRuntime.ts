// FILE: lib/product/institutionalPreviewRuntime.ts
// Preview-only isolation boot checks (no DEMO origin assumptions).

import { auditRuntimeSupabaseBinding } from "@/lib/supabase/runtimeSupabaseBinding";

export class InstitutionalPreviewIsolationError extends Error {
  readonly code = "institutional_preview_isolation_violation";
  readonly fail_codes: InstitutionalPreviewFailCode[];

  constructor(failCodes: InstitutionalPreviewFailCode[]) {
    super("institutional_preview_isolation_violation");
    this.name = "InstitutionalPreviewIsolationError";
    this.fail_codes = failCodes;
  }
}

export type InstitutionalPreviewFailCode =
  | "preview_production_supabase"
  | "preview_production_runtime_on_product_host";

const PUBLIC_PRODUCT_HOSTS_PREVIEW_BLOCK = new Set([
  "abraxasworld.xyz",
  "www.abraxasworld.xyz",
  "abraxas-app.vercel.app",
]);

function configuredHost(env: Record<string, string | undefined>): string | null {
  const origin = (env.NEXT_PUBLIC_APP_URL?.trim() || env.ABRAXAS_ISSUER_URL?.trim() || "").replace(/\/$/, "");
  if (!origin) return null;
  try {
    return new URL(origin.includes("://") ? origin : `https://${origin}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function evaluateInstitutionalPreviewRuntime(
  env: Record<string, string | undefined> = process.env,
): { ok: boolean; fail_codes: InstitutionalPreviewFailCode[] } {
  if (env.VERCEL_ENV?.trim() !== "preview") {
    return { ok: true, fail_codes: [] };
  }

  const fail_codes: InstitutionalPreviewFailCode[] = [];
  const audit = auditRuntimeSupabaseBinding({
    url: env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  });

  if (audit.production_ref_detected) {
    fail_codes.push("preview_production_supabase");
  }

  const host = configuredHost(env);
  if (
    env.ABRAXAS_RUNTIME_ENV?.trim() === "production"
    && host
    && PUBLIC_PRODUCT_HOSTS_PREVIEW_BLOCK.has(host)
  ) {
    fail_codes.push("preview_production_runtime_on_product_host");
  }

  return { ok: fail_codes.length === 0, fail_codes };
}

export function assertInstitutionalPreviewBoot(
  env: Record<string, string | undefined> = process.env,
): void {
  const evaluation = evaluateInstitutionalPreviewRuntime(env);
  if (evaluation.ok) return;
  throw new InstitutionalPreviewIsolationError(evaluation.fail_codes);
}
