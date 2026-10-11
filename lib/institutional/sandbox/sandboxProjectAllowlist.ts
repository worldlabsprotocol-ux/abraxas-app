// Explicit non-production Supabase targets for institutional sandbox activation.

import { DEMO_SUPABASE_PROJECT_REF, isKnownProductionSupabaseRef, supabaseProjectRefFromUrl } from "@/lib/supabase/projectRefs";

export type SandboxTargetVerdict = "PASS" | "FAIL" | "BLOCKED";

export type SandboxSupabaseTargetCheck = {
  verdict: SandboxTargetVerdict;
  environment_id: string | null;
  observed_project_ref: string | null;
  allowlisted: boolean;
  is_production_ref: boolean;
  detail: string;
};

/** Operator-declared sandbox identity (never inferred from Vercel alone). */
export function resolveInstitutionalSandboxEnvironmentId(): string | null {
  const id = process.env.INSTITUTIONAL_SANDBOX_ENVIRONMENT_ID?.trim();
  return id || null;
}

export function parseInstitutionalSandboxAllowlistRefs(): string[] {
  const raw = process.env.INSTITUTIONAL_SANDBOX_ALLOWED_PROJECT_REFS?.trim();
  if (!raw) {
    return [DEMO_SUPABASE_PROJECT_REF];
  }
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

export function evaluateSandboxSupabaseTarget(input?: {
  supabaseUrl?: string;
  environmentId?: string | null;
  allowedRefs?: string[];
}): SandboxSupabaseTargetCheck {
  const environment_id = input?.environmentId ?? resolveInstitutionalSandboxEnvironmentId();
  const url = input?.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const observed = supabaseProjectRefFromUrl(url);
  const allowed = input?.allowedRefs ?? parseInstitutionalSandboxAllowlistRefs();
  const isProduction = isKnownProductionSupabaseRef(observed);

  if (!environment_id) {
    return {
      verdict: "BLOCKED",
      environment_id: null,
      observed_project_ref: observed,
      allowlisted: false,
      is_production_ref: isProduction,
      detail: "Set INSTITUTIONAL_SANDBOX_ENVIRONMENT_ID to an explicit non-production label (e.g. abraxas-demo-sandbox).",
    };
  }

  if (!observed) {
    return {
      verdict: "BLOCKED",
      environment_id,
      observed_project_ref: null,
      allowlisted: false,
      is_production_ref: false,
      detail: "NEXT_PUBLIC_SUPABASE_URL missing or not a supabase.co hostname.",
    };
  }

  if (isProduction) {
    return {
      verdict: "FAIL",
      environment_id,
      observed_project_ref: observed,
      allowlisted: false,
      is_production_ref: true,
      detail: "Configured Supabase project ref is a known production ref. Abort sandbox activation.",
    };
  }

  const allowlisted = allowed.includes(observed);
  if (!allowlisted) {
    return {
      verdict: "FAIL",
      environment_id,
      observed_project_ref: observed,
      allowlisted: false,
      is_production_ref: false,
      detail: `Ref ${observed} not in INSTITUTIONAL_SANDBOX_ALLOWED_PROJECT_REFS (${allowed.join(", ")}).`,
    };
  }

  return {
    verdict: "PASS",
    environment_id,
    observed_project_ref: observed,
    allowlisted: true,
    is_production_ref: false,
    detail: `Non-production sandbox target ${observed} allowlisted for ${environment_id}.`,
  };
}

export function sandboxDatabaseUrlForPrivilegeProbe(): string | null {
  return (
    process.env.INSTITUTIONAL_SANDBOX_DATABASE_URL?.trim()
    || process.env.INSTITUTIONAL_REPLAY_TEST_DATABASE_URL?.trim()
    || null
  );
}
