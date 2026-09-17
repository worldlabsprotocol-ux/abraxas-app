// FILE: lib/demo/referencePartnerBrowse.ts
// Safe, Abraxas-controlled entry URL for the progressive-proof reference partner.

import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
} from "@/lib/goodTrouble/constants";

export const REFERENCE_PARTNER_BROWSE_CALLBACK_PATH = "/demo/reference-partner/browse-callback";

export function buildReferencePartnerBrowseVerifyUrl(origin: string): string {
  const callbackUrl = new URL(REFERENCE_PARTNER_BROWSE_CALLBACK_PATH, origin);
  const verifyUrl = new URL("/partner/verify", origin);
  verifyUrl.searchParams.set("partner_id", GOOD_TROUBLE_PARTNER_ID);
  verifyUrl.searchParams.set("policy_id", GOOD_TROUBLE_BROWSE_POLICY_ID);
  verifyUrl.searchParams.set("purpose", "browse");
  verifyUrl.searchParams.set("return_url", callbackUrl.toString());
  return verifyUrl.toString();
}
