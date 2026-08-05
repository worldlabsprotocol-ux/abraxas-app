// FILE: lib/goodTrouble/pilotExample.ts
// Good Trouble — labeled pilot reference example only. Not a generic integration template.

import {
  GOOD_TROUBLE_BRAND,
  GOOD_TROUBLE_ENTER_PATH,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import type { ReferenceRelyingPartyConfig } from "@/lib/partner/referenceRelyingPartyConfig";
import { SITE_URL } from "@/lib/siteUrl";

/** Clearly labeled Good Trouble pilot — use env-driven config for new protocols. */
export const GOOD_TROUBLE_PILOT_EXAMPLE: ReferenceRelyingPartyConfig = {
  baseUrl: SITE_URL,
  partnerId: GOOD_TROUBLE_PARTNER_ID,
  policyId: GOOD_TROUBLE_RETAIL_POLICY_ID,
  returnUrl: `${SITE_URL}${GOOD_TROUBLE_ENTER_PATH}`,
  displayName: `${GOOD_TROUBLE_BRAND.name} (pilot reference)`,
};

export const GOOD_TROUBLE_PILOT_LABEL =
  "Good Trouble is Abraxas's hosted pilot checkout — not a generic integration template.";
