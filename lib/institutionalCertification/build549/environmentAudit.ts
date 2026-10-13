// FILE: lib/institutionalCertification/build549/environmentAudit.ts

import { resolveInstitutionalStagingTarget } from "@/lib/partner/launchpad/resolveInstitutionalStagingTarget";
import { probeStagingDeploymentIdentity } from "@/lib/partner/universalIntegration/stagingActivationReadiness";
import { resolveBuild548DatabaseUrl } from "@/lib/institutionalCertification/build548/postgresConsumptionStore";
import { redactBypassFromUrl } from "@/lib/preview/vercelBypass";
import { REFERENCE_RP_ENV_KEYS } from "@/lib/partner/referenceRelyingPartyConfig";

const PREREQUISITE_KEYS = [
  "INSTITUTIONAL_SANDBOX_BASE_URL",
  "LAUNCHPAD_STAGING_URL",
  "PARTNER_FLOW_RP_PARTNER_ID",
  "PARTNER_FLOW_RP_POLICY_ID",
  "PARTNER_FLOW_RP_RETURN_URL",
  "LAUNCHPAD_STUDIO_API_KEY",
  "LAUNCHPAD_STUDIO_APPLICATION_ID",
  "BUILD_547_SYNTHETIC_RECEIPT_ID",
  "BUILD_548_PG_URL",
  "VERCEL_PROTECTION_BYPASS",
  "LAUNCHPAD_EXPECTED_SUPABASE_REF",
] as const;

export function auditBuild549Prerequisites(env: NodeJS.ProcessEnv = process.env): {
  configured: string[];
  missing: string[];
  operator_required: string[];
} {
  const configured: string[] = [];
  const missing: string[] = [];
  for (const key of PREREQUISITE_KEYS) {
    if (key === "BUILD_548_PG_URL") {
      if (env.BUILD_548_PG_URL?.trim() || env.INSTITUTIONAL_REPLAY_TEST_DATABASE_URL?.trim()) {
        configured.push(
          env.BUILD_548_PG_URL?.trim() ? "BUILD_548_PG_URL" : "INSTITUTIONAL_REPLAY_TEST_DATABASE_URL",
        );
      } else {
        missing.push("BUILD_548_PG_URL (or INSTITUTIONAL_REPLAY_TEST_DATABASE_URL)");
      }
      continue;
    }
    if (env[key]?.trim()) configured.push(key);
    else missing.push(key);
  }
  const operator_required = missing.filter(
    (k) =>
      k.includes("PARTNER_FLOW")
      || k.includes("LAUNCHPAD_STUDIO")
      || k.includes("BUILD_547_SYNTHETIC")
      || k.includes("PLAYWRIGHT"),
  );
  return { configured, missing, operator_required };
}

export async function probeBuild549EnvironmentIdentity(env: NodeJS.ProcessEnv = process.env) {
  const staging = resolveInstitutionalStagingTarget(env);
  const prereq = auditBuild549Prerequisites(env);
  if (!staging.ok) {
    return {
      ok: false as const,
      blockers: staging.blockers,
      prereq,
      identity: null,
    };
  }
  const probe = await probeStagingDeploymentIdentity({
    baseUrl: staging.target.stagingUrl,
    expectedSupabaseRef: staging.target.expectedSupabaseRef,
    vercelBypass: staging.target.vercelProtectionBypass,
  });
  return {
    ok: probe.ok,
    blockers: probe.ok ? [] : [probe.detail],
    prereq,
    identity: {
      staging_url_redacted: redactBypassFromUrl(staging.target.stagingUrl),
      expected_supabase_ref: staging.target.expectedSupabaseRef,
      deployed_commit_sha_prefix: probe.commit_sha_prefix,
      deployment_environment: probe.deployment_environment,
      vercel_protection_configured: Boolean(staging.target.vercelProtectionBypass),
      bypass_configured: Boolean(staging.target.vercelProtectionBypass),
      stagingUrl: staging.target.stagingUrl,
      bypass: staging.target.vercelProtectionBypass,
      rp_partner_id: env[REFERENCE_RP_ENV_KEYS.partnerId]?.trim() ?? null,
      rp_policy_id: env[REFERENCE_RP_ENV_KEYS.policyId]?.trim() ?? null,
      rp_return_url: env[REFERENCE_RP_ENV_KEYS.returnUrl]?.trim() ?? null,
      studio_api_key_set: Boolean(env.LAUNCHPAD_STUDIO_API_KEY?.trim()),
      studio_application_id: env.LAUNCHPAD_STUDIO_APPLICATION_ID?.trim() ?? null,
      synthetic_receipt_id: env.BUILD_547_SYNTHETIC_RECEIPT_ID?.trim() ?? null,
      postgres_url_configured: Boolean(resolveBuild548DatabaseUrl()),
    },
  };
}
