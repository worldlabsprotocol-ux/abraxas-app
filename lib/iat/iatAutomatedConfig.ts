// FILE: lib/iat/iatAutomatedConfig.ts
// Resolve automated IAT companion options from environment.

import {
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import { goodTroubleProductionReturnUrl } from "@/lib/goodTrouble/partnerIntegration";
import { SITE_URL } from "@/lib/siteUrl";

export const IAT_AUTOMATED_ENV_KEYS = {
  baseUrl: "IAT_BASE_URL",
  reportDir: "IAT_REPORT_DIR",
} as const;

export interface IatAutomatedOptions {
  baseUrl: string;
  partnerId: string;
  policyId: string;
  returnUrl: string;
  productionMode: boolean;
  reportDir: string;
}

export function normalizeIatBaseUrl(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/\/$/, "");
}

export function resolveIatAutomatedOptions(
  env: Record<string, string | undefined> = process.env,
): IatAutomatedOptions {
  const baseUrl = normalizeIatBaseUrl(env[IAT_AUTOMATED_ENV_KEYS.baseUrl]) || SITE_URL;
  const reportDir = env[IAT_AUTOMATED_ENV_KEYS.reportDir]?.trim() || "reports/iat-automated";

  return {
    baseUrl,
    partnerId: GOOD_TROUBLE_PARTNER_ID,
    policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    returnUrl: goodTroubleProductionReturnUrl(),
    productionMode: baseUrl === SITE_URL || new URL(baseUrl).origin === new URL(SITE_URL).origin,
    reportDir,
  };
}
