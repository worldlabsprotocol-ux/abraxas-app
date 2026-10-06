// FILE: examples/verify-with-abraxas-external/lib/partnerKit.ts
// Thin wrapper over the public PartnerKit — no Abraxas internals.

import { AbraxasPartnerKit } from "@abraxas/partner-kit";
import type { ExternalVerifyConfig } from "./config";

export function createExternalPartnerKit(
  config: ExternalVerifyConfig,
  env: Record<string, string | undefined>,
  fetchFn?: typeof fetch,
) {
  return new AbraxasPartnerKit({
    partnerId: config.partnerId,
    policyId: config.policyId,
    policyPackId: config.policyPackId,
    environment: config.environment,
    applicationId: config.applicationId,
    apiKey: env.ABRAXAS_SANDBOX_API_KEY,
    baseUrl: config.abraxasBaseUrl,
    fetchFn,
  });
}
