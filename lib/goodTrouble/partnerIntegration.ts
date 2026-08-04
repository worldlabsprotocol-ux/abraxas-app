// FILE: lib/goodTrouble/partnerIntegration.ts
// Good Trouble as reference relying-party integration (config-only, no GT-specific flow logic).

import {
  GOOD_TROUBLE_BRAND,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import {
  buildPartnerVerifyUrl,
  resolvePartnerReturnUrl,
  type PartnerIntegrationConfig,
} from "@/lib/partner/referenceIntegration";
import { SITE_URL } from "@/lib/siteUrl";

export const GOOD_TROUBLE_INTEGRATION: PartnerIntegrationConfig = {
  partnerId: GOOD_TROUBLE_PARTNER_ID,
  policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
  enterPath: "/good-trouble/enter",
  displayName: GOOD_TROUBLE_BRAND.name,
};

export function goodTroubleVerifyUrl(origin?: string): string {
  return buildPartnerVerifyUrl(GOOD_TROUBLE_INTEGRATION, { origin });
}

export function goodTroubleReturnUrl(origin?: string): string {
  return resolvePartnerReturnUrl(GOOD_TROUBLE_INTEGRATION, origin);
}

/** Production retail entry — canonical abraxasworld.xyz partner verify + enter callback. */
export function goodTroubleProductionVerifyUrl(): string {
  return goodTroubleVerifyUrl(SITE_URL);
}

export function goodTroubleProductionReturnUrl(): string {
  return goodTroubleReturnUrl(SITE_URL);
}
