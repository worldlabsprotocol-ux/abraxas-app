// FILE: lib/partner/universalIntegration/stagingConfigContract.ts
// Fail-closed staging preflight for Example Merchant live E2E — no secrets in repo.

import {
  REFERENCE_RP_ENV_KEYS,
  resolveReferenceRelyingPartyConfig,
  validatePartnerReturnUrlFormat,
  type ReferenceRelyingPartyConfig,
} from "@/lib/partner/referenceRelyingPartyConfig";
import { KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS } from "@/scripts/demo/lib/knownProductionSupabaseProjectRefs";

export const STAGING_LIVE_E2E_ENV_KEYS = {
  launchpadApplicationId: "EXAMPLE_MERCHANT_LAUNCHPAD_APPLICATION_ID",
  expectedSupabaseRef: "LAUNCHPAD_EXPECTED_SUPABASE_REF",
  storageState: "PLAYWRIGHT_STORAGE_STATE",
  artifactPath: "EXAMPLE_MERCHANT_LIVE_E2E_ARTIFACT",
  callbackCaptureUrl: "EXAMPLE_MERCHANT_LIVE_CALLBACK_URL",
  vercelBypass: "VERCEL_PROTECTION_BYPASS",
  automationSource: "PARTNER_LIVE_E2E_AUTOMATION_SOURCE",
} as const;

const BLOCKED_BASE_HOSTS = new Set([
  "abraxas-app.vercel.app",
  "www.abraxasworld.xyz",
  "abraxasworld.xyz",
]);

export interface StagingLiveE2eConfig {
  rp: ReferenceRelyingPartyConfig;
  launchpadApplicationId: string | null;
  expectedSupabaseRef: string | null;
  storageStatePath: string | null;
  artifactPath: string;
  callbackCaptureUrl: string | null;
  vercelProtectionBypass: string | null;
  automationSource: "playwright" | "manual_checkpoint" | "operator_env";
}

export interface StagingPreflightDiagnostic {
  ok: boolean;
  errors: string[];
  warnings: string[];
  config: StagingLiveE2eConfig | null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validateStagingBaseUrl(baseUrl: string, errors: string[], warnings: string[]): void {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    errors.push(`${REFERENCE_RP_ENV_KEYS.baseUrl}_invalid_url`);
    return;
  }
  if (parsed.protocol !== "https:") {
    errors.push(`${REFERENCE_RP_ENV_KEYS.baseUrl}_must_be_https`);
  }
  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_BASE_HOSTS.has(host)) {
    errors.push(`${REFERENCE_RP_ENV_KEYS.baseUrl}_production_host_blocked`);
  }
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    warnings.push("staging_base_url_is_localhost");
  }
}

export function runStagingLiveE2ePreflight(
  env: Record<string, string | undefined> = process.env,
): StagingPreflightDiagnostic {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { config: rp, missing } = resolveReferenceRelyingPartyConfig(env);
  if (missing.length) {
    errors.push(...missing.map((k) => `missing_${k}`));
  }

  if (rp) {
    validateStagingBaseUrl(rp.baseUrl, errors, warnings);
    const returnCheck = validatePartnerReturnUrlFormat(rp.returnUrl);
    if (!returnCheck.ok) {
      errors.push(...returnCheck.errors.map((e) => `return_url_${e}`));
    }
    try {
      const returnHost = new URL(rp.returnUrl).hostname.toLowerCase();
      if (BLOCKED_BASE_HOSTS.has(returnHost)) {
        errors.push("return_url_production_host_blocked");
      }
    } catch {
      // covered by validatePartnerReturnUrlFormat
    }
  }

  const expectedSupabaseRef = env[STAGING_LIVE_E2E_ENV_KEYS.expectedSupabaseRef]?.trim() ?? "";
  if (expectedSupabaseRef) {
    if (KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS.includes(expectedSupabaseRef as never)) {
      errors.push("expected_supabase_ref_is_production");
    }
  } else {
    warnings.push("LAUNCHPAD_EXPECTED_SUPABASE_REF_not_set");
  }

  const launchpadApplicationId = env[STAGING_LIVE_E2E_ENV_KEYS.launchpadApplicationId]?.trim() ?? "";
  if (launchpadApplicationId && !isUuid(launchpadApplicationId)) {
    errors.push("launchpad_application_id_invalid_uuid");
  }

  const automationRaw = env[STAGING_LIVE_E2E_ENV_KEYS.automationSource]?.trim() ?? "playwright";
  const automationSource = automationRaw === "manual_checkpoint" || automationRaw === "operator_env"
    ? automationRaw
    : "playwright";

  const artifactPath = env[STAGING_LIVE_E2E_ENV_KEYS.artifactPath]?.trim()
    || "reports/example-merchant-live-e2e-artifact.json";

  const callbackCaptureUrl = env[STAGING_LIVE_E2E_ENV_KEYS.callbackCaptureUrl]?.trim() || null;
  if (callbackCaptureUrl) {
    try {
      const u = new URL(callbackCaptureUrl);
      if (u.protocol !== "https:" && u.protocol !== "http:") {
        errors.push("callback_capture_url_invalid_protocol");
      }
    } catch {
      errors.push("callback_capture_url_invalid");
    }
  }

  if (errors.length > 0 || !rp) {
    return { ok: false, errors, warnings, config: null };
  }

  return {
    ok: true,
    errors,
    warnings,
    config: {
      rp,
      launchpadApplicationId: launchpadApplicationId || null,
      expectedSupabaseRef: expectedSupabaseRef || null,
      storageStatePath: env[STAGING_LIVE_E2E_ENV_KEYS.storageState]?.trim() || null,
      artifactPath,
      callbackCaptureUrl,
      vercelProtectionBypass: env[STAGING_LIVE_E2E_ENV_KEYS.vercelBypass]?.trim() || null,
      automationSource,
    },
  };
}
