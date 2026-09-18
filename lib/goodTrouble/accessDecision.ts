// FILE: lib/goodTrouble/accessDecision.ts
// Good Trouble reference partner: server decision via the Partner Integration Kit.

import { AbraxasPartnerKit, permitProtocolAction } from "@/lib/partner/integrationKit";
import { GOOD_TROUBLE_PARTNER_ID, GOOD_TROUBLE_RETAIL_POLICY_ID } from "@/lib/goodTrouble/constants";
import { SITE_URL } from "@/lib/siteUrl";
import type { PartnerKitSafeResult } from "@/lib/partner/integrationKit";

export function goodTroublePartnerKit(fetchFn?: typeof fetch): AbraxasPartnerKit {
  return new AbraxasPartnerKit({
    partnerId: GOOD_TROUBLE_PARTNER_ID,
    policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
    environment: "sandbox",
    baseUrl: SITE_URL,
    fetchFn,
  });
}

export async function decideGoodTroubleAccess(
  search: URLSearchParams | Record<string, string | string[] | undefined>,
  fetchFn?: typeof fetch,
): Promise<PartnerKitSafeResult & { grant: boolean }> {
  const result = await goodTroublePartnerKit(fetchFn).verifyCallback(search);
  return { ...result, grant: permitProtocolAction(result) };
}
