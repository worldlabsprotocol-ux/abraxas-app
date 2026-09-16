// FILE: lib/stocklana/partnerIntegration.ts

import {
  STOCKLANA_BRAND,
  STOCKLANA_CALLBACK_PATH,
  STOCKLANA_ELIGIBILITY_POLICY_ID,
  STOCKLANA_PARTNER_ID,
} from "@/lib/stocklana/constants";
import {
  buildPartnerVerifyUrl,
  resolvePartnerReturnUrl,
  type PartnerIntegrationConfig,
} from "@/lib/partner/referenceIntegration";

export const STOCKLANA_INTEGRATION: PartnerIntegrationConfig = {
  partnerId: STOCKLANA_PARTNER_ID,
  policyId: STOCKLANA_ELIGIBILITY_POLICY_ID,
  enterPath: STOCKLANA_CALLBACK_PATH,
  displayName: STOCKLANA_BRAND.name,
};

export function stocklanaVerifyUrl(origin?: string, assetId?: string): string {
  return buildPartnerVerifyUrl(STOCKLANA_INTEGRATION, {
    origin,
    returnUrl: stocklanaReturnUrl(origin, assetId),
  });
}

export function stocklanaReturnUrl(origin?: string, assetId?: string): string {
  const base = resolvePartnerReturnUrl(STOCKLANA_INTEGRATION, origin);
  if (!assetId) return base;
  const url = new URL(base);
  url.searchParams.set("asset", assetId);
  return url.toString();
}
