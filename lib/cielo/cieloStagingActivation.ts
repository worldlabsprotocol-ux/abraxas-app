// FILE: lib/cielo/cieloStagingActivation.ts
// Cielo staging activation readiness — reuses Build #500 universal checks.

import { runCieloE2eChecks } from "@/lib/cieloE2eCheck";
import { buildStagingActivationReadinessReport, type StagingActivationReadinessReport } from "@/lib/partner/universalIntegration/stagingActivationReadiness";
import {
  CIELO_DEMO_SUPABASE_PROJECT_REF,
  CIELO_STAGING_ENV_KEYS,
  getCieloMerchantCanonicalConfig,
} from "@/lib/cielo/cieloMerchantProfile";

export interface CieloStagingActivationReport {
  merchant: ReturnType<typeof getCieloMerchantCanonicalConfig>;
  universal: StagingActivationReadinessReport;
  cielo_e2e: Awaited<ReturnType<typeof runCieloE2eChecks>> | null;
  overall: "ready_to_execute" | "blocked" | "operator_setup_required";
  blockers: string[];
}

export async function buildCieloStagingActivationReport(
  env: Record<string, string | undefined> = process.env,
  deps?: { fetch?: typeof fetch },
): Promise<CieloStagingActivationReport> {
  const merchant = getCieloMerchantCanonicalConfig();
  const baseUrl = (
    env.PARTNER_FLOW_RP_BASE_URL
    ?? env[CIELO_STAGING_ENV_KEYS.stagingBaseUrl]?.trim()
    ?? env.LAUNCHPAD_STAGING_URL?.trim()
    ?? ""
  ).replace(/\/$/, "");

  const mergedEnv = {
    ...env,
    PARTNER_FLOW_RP_PARTNER_ID: env.PARTNER_FLOW_RP_PARTNER_ID ?? merchant.partner_id,
    PARTNER_FLOW_RP_POLICY_ID: env.PARTNER_FLOW_RP_POLICY_ID ?? merchant.policy_id,
    PARTNER_FLOW_RP_BASE_URL: baseUrl,
    PARTNER_FLOW_RP_RETURN_URL: env.PARTNER_FLOW_RP_RETURN_URL
      ?? (baseUrl ? `${baseUrl}/cielo/verified-rate` : ""),
    LAUNCHPAD_EXPECTED_SUPABASE_REF:
      env.LAUNCHPAD_EXPECTED_SUPABASE_REF ?? CIELO_DEMO_SUPABASE_PROJECT_REF,
  };

  const universal = await buildStagingActivationReadinessReport(mergedEnv, deps);

  let cielo_e2e: CieloStagingActivationReport["cielo_e2e"] = null;
  if (env.NEXT_PUBLIC_SUPABASE_URL?.trim() && env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    cielo_e2e = await runCieloE2eChecks();
  }

  const blockers = [...universal.findings.filter((f) => f.status === "missing" || f.status === "invalid").map((f) => f.id)];
  if (cielo_e2e && cielo_e2e.failCount > 0) {
    blockers.push("cielo_e2e_checks_failed");
  }
  if (universal.deployment_probe && !universal.deployment_probe.ok) {
    blockers.push("staging_deployment_not_isolated");
  }

  let overall = universal.overall;
  if (cielo_e2e?.failCount) overall = "blocked";

  return {
    merchant,
    universal,
    cielo_e2e,
    overall,
    blockers,
  };
}
