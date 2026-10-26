// FILE: lib/partner/trustExecution/controlledTestEvidenceGate.ts
// Controlled synthetic evidence is CI/disposable only — never Demo/Production/preview deploy toggles.

import { parseSovereignEnvClass } from "@/lib/sovereignRuntime/sovereignActivationPolicy";
import { supabaseProjectRefFromPostgresUrl } from "@/lib/supabase/projectRefs";

const DEMO_PROJECT_REF_DENY = "ocntwbxarpjeixdnzide";

export type ControlledTestEvidenceGateResult =
  | { allowed: true }
  | { allowed: false; code: string };

function isBlockedDeploymentClass(env: Record<string, string | undefined>): string | null {
  const vercelEnv = env.VERCEL_ENV?.trim().toLowerCase();
  if (vercelEnv === "production") return "production_deploy_forbidden";
  if (vercelEnv === "preview") return "preview_deploy_forbidden";

  const runtime = env.ABRAXAS_RUNTIME_ENVIRONMENT?.trim().toLowerCase();
  if (runtime === "production" || runtime === "demo") return "runtime_environment_forbidden";

  const dbUrl =
    env.ABRAXAS_SOVEREIGN_STAGING_PG_URL?.trim()
    ?? env.ABRAXAS_DATABASE_URL?.trim()
    ?? "";
  const ref = supabaseProjectRefFromPostgresUrl(dbUrl);
  if (ref === DEMO_PROJECT_REF_DENY) return "demo_database_forbidden";

  return null;
}

/**
 * Synthetic trust execution evidence may run only in an explicitly disposable,
 * fixture-attested CI environment — not via a lone env toggle on a deployable route.
 */
export function evaluateControlledTestEvidenceGate(
  env: Record<string, string | undefined> = process.env,
): ControlledTestEvidenceGateResult {
  if (env.ABRAXAS_TRUST_EXECUTION_CONTROLLED_TEST_EVIDENCE?.trim() !== "1") {
    return { allowed: false, code: "controlled_test_flag_off" };
  }

  const deployBlock = isBlockedDeploymentClass(env);
  if (deployBlock) return { allowed: false, code: deployBlock };

  const envClass = parseSovereignEnvClass(env);
  if (envClass !== "disposable") {
    return { allowed: false, code: "requires_disposable_sovereign_class" };
  }

  const fixtureWrites = env.ABRAXAS_SOVEREIGN_STAGING_FIXTURE_WRITES?.trim().toLowerCase();
  if (fixtureWrites !== "true") {
    return { allowed: false, code: "requires_fixture_writes_attestation" };
  }

  if (env.ABRAXAS_TRUST_EXECUTION_FIXTURE_ATTESTATION?.trim() !== "disposable_ci_only") {
    return { allowed: false, code: "requires_fixture_attestation" };
  }

  return { allowed: true };
}

export function resolveTrustExecutionEvidenceMode(
  env: Record<string, string | undefined> = process.env,
): "controlled_test_evidence" | "live_authoritative_evidence" {
  return evaluateControlledTestEvidenceGate(env).allowed
    ? "controlled_test_evidence"
    : "live_authoritative_evidence";
}
