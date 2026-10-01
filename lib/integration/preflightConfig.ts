// FILE: lib/integration/preflightConfig.ts
// Resolve integration preflight CLI options from environment.

import {
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
  GOOD_TROUBLE_ENTER_PATH,
} from "@/lib/goodTrouble/constants";
import {
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
  GOOD_TROUBLE_EXPECTED_CALLBACK_URL,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import { SITE_URL } from "@/lib/siteUrl";
import type { PreflightOptions } from "@/lib/integration/preflightTypes";

const STALE_HOST = "abraxas-app.vercel.app";

export const INTEGRATION_PREFLIGHT_ENV_KEYS = {
  baseUrl: "INTEGRATION_PREFLIGHT_BASE_URL",
  partnerId: "INTEGRATION_PREFLIGHT_PARTNER_ID",
  policyId: "INTEGRATION_PREFLIGHT_POLICY_ID",
  returnUrl: "INTEGRATION_PREFLIGHT_RETURN_URL",
  productionMode: "INTEGRATION_PREFLIGHT_PRODUCTION_MODE",
  track: "INTEGRATION_PREFLIGHT_TRACK",
} as const;

export type IntegrationPreflightTrack = "legacy" | "canonical";

export function resolveIntegrationPreflightTrack(
  env: Record<string, string | undefined> = process.env,
): IntegrationPreflightTrack {
  const raw = env[INTEGRATION_PREFLIGHT_ENV_KEYS.track]?.trim().toLowerCase();
  return raw === "canonical" ? "canonical" : "legacy";
}

export function normalizeBaseUrl(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/\/$/, "");
}

export function isProductionPreflightMode(
  baseUrl: string,
  env: Record<string, string | undefined>,
): boolean {
  if (env[INTEGRATION_PREFLIGHT_ENV_KEYS.productionMode]?.trim() === "true") {
    return true;
  }
  if (!baseUrl) return false;
  try {
    return new URL(baseUrl).origin === new URL(SITE_URL).origin;
  } catch {
    return false;
  }
}

export function resolvePreflightOptions(
  env: Record<string, string | undefined> = process.env,
): PreflightOptions {
  const baseUrl = normalizeBaseUrl(env[INTEGRATION_PREFLIGHT_ENV_KEYS.baseUrl]);
  const track = resolveIntegrationPreflightTrack(env);
  const defaultPartnerId = track === "canonical"
    ? GOOD_TROUBLE_CANONICAL_PARTNER_ID
    : GOOD_TROUBLE_PARTNER_ID;
  const defaultPolicyId = track === "canonical"
    ? GOOD_TROUBLE_CANONICAL_POLICY_ID
    : GOOD_TROUBLE_RETAIL_POLICY_ID;
  const partnerId =
    env[INTEGRATION_PREFLIGHT_ENV_KEYS.partnerId]?.trim() || defaultPartnerId;
  const policyId =
    env[INTEGRATION_PREFLIGHT_ENV_KEYS.policyId]?.trim() || defaultPolicyId;

  const explicitReturn = env[INTEGRATION_PREFLIGHT_ENV_KEYS.returnUrl]?.trim();
  const defaultReturn = track === "canonical"
    ? GOOD_TROUBLE_EXPECTED_CALLBACK_URL
    : (baseUrl ? `${baseUrl}${GOOD_TROUBLE_ENTER_PATH}` : `${SITE_URL}${GOOD_TROUBLE_ENTER_PATH}`);
  const returnUrl = explicitReturn || defaultReturn;

  return {
    baseUrl,
    partnerId,
    policyId,
    returnUrl,
    productionMode: isProductionPreflightMode(baseUrl, env),
  };
}

export function configuredEnvUsesStaleHost(env: Record<string, string | undefined>): string[] {
  const keys = ["NEXT_PUBLIC_APP_URL", "ABRAXAS_ISSUER_URL", "VERCEL_URL"] as const;
  const offenders: string[] = [];
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value && value.includes(STALE_HOST)) {
      offenders.push(`${key}=${value}`);
    }
  }
  return offenders;
}
