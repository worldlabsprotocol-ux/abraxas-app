// FILE: lib/partner/partnerConformanceConfig.ts
// Resolve partner conformance CLI options from environment.

import {
  REFERENCE_RP_ENV_KEYS,
  normalizeReferenceBaseUrl,
  resolveReferenceRelyingPartyConfig,
} from "@/lib/partner/referenceRelyingPartyConfig";
import { isProductionPreflightMode } from "@/lib/integration/preflightConfig";
import type { PartnerConformanceOptions } from "@/lib/partner/partnerConformanceHarness";

export const PARTNER_CONFORMANCE_ENV_KEYS = {
  allowSandbox: "PARTNER_CONFORMANCE_ALLOW_SANDBOX",
  skipLiveManifest: "PARTNER_CONFORMANCE_SKIP_LIVE_MANIFEST",
} as const;

export function resolvePartnerConformanceOptions(
  env: Record<string, string | undefined> = process.env,
): PartnerConformanceOptions & { configMissing: string[] } {
  const { config, missing } = resolveReferenceRelyingPartyConfig(env);
  const baseUrl = normalizeReferenceBaseUrl(env[REFERENCE_RP_ENV_KEYS.baseUrl]);

  return {
    baseUrl,
    partnerId: config?.partnerId ?? "",
    policyId: config?.policyId ?? "",
    returnUrl: config?.returnUrl ?? "",
    productionMode: isProductionPreflightMode(baseUrl || config?.baseUrl || "", env),
    allowSandbox: env[PARTNER_CONFORMANCE_ENV_KEYS.allowSandbox]?.trim() === "true",
    skipLiveManifest: env[PARTNER_CONFORMANCE_ENV_KEYS.skipLiveManifest]?.trim() === "true",
    configMissing: missing,
  };
}
