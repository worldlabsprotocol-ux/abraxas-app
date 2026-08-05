// FILE: lib/integration/preflightConfig.ts
// Resolve integration preflight CLI options from environment.

import {
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
  GOOD_TROUBLE_ENTER_PATH,
} from "@/lib/goodTrouble/constants";
import { SITE_URL } from "@/lib/siteUrl";
import type { PreflightOptions } from "@/lib/integration/preflightTypes";

const STALE_HOST = "abraxas-app.vercel.app";

export const INTEGRATION_PREFLIGHT_ENV_KEYS = {
  baseUrl: "INTEGRATION_PREFLIGHT_BASE_URL",
  partnerId: "INTEGRATION_PREFLIGHT_PARTNER_ID",
  policyId: "INTEGRATION_PREFLIGHT_POLICY_ID",
  returnUrl: "INTEGRATION_PREFLIGHT_RETURN_URL",
  productionMode: "INTEGRATION_PREFLIGHT_PRODUCTION_MODE",
} as const;

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
  const partnerId =
    env[INTEGRATION_PREFLIGHT_ENV_KEYS.partnerId]?.trim() || GOOD_TROUBLE_PARTNER_ID;
  const policyId =
    env[INTEGRATION_PREFLIGHT_ENV_KEYS.policyId]?.trim() || GOOD_TROUBLE_RETAIL_POLICY_ID;

  const explicitReturn = env[INTEGRATION_PREFLIGHT_ENV_KEYS.returnUrl]?.trim();
  const returnUrl =
    explicitReturn ||
    (baseUrl ? `${baseUrl}${GOOD_TROUBLE_ENTER_PATH}` : `${SITE_URL}${GOOD_TROUBLE_ENTER_PATH}`);

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
