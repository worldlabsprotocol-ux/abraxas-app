// FILE: lib/partner/resolvePartnerContinueContext.ts
// Authoritative partner /continue flow context — server policy wins over loose URL params.

import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import { isGoodTroubleBrowseFlow } from "@/lib/partner/goodTroubleBrowseFlow";

export type PartnerContinueUrlParams = {
  partnerId: string;
  policyId: string;
  purpose: string | null;
  returnUrl: string;
  verifyRequestId: string | null;
};

export type PartnerContinueServerContext = {
  partnerId: string;
  policyId: string;
};

export type ResolvedPartnerContinueContext = PartnerContinueUrlParams & {
  isDobFirstBrowse: boolean;
  authoritative: boolean;
};

/**
 * Derive purpose from an authoritative verification-request policy.
 * Browse policy always maps to browse; retail never inherits a loose browse purpose.
 */
export function derivePurposeFromAuthoritativePolicy(input: {
  partnerId: string;
  policyId: string;
  urlPurpose?: string | null;
}): string | null {
  if (input.partnerId !== GOOD_TROUBLE_PARTNER_ID) {
    return input.urlPurpose?.trim() || null;
  }

  if (input.policyId === GOOD_TROUBLE_BROWSE_POLICY_ID) {
    return "browse";
  }

  if (input.policyId === GOOD_TROUBLE_RETAIL_POLICY_ID) {
    const urlPurpose = input.urlPurpose?.trim();
    return urlPurpose === "purchase" ? "purchase" : "purchase";
  }

  return input.urlPurpose?.trim() || null;
}

export function resolvePartnerContinueContext(
  url: PartnerContinueUrlParams,
  server?: PartnerContinueServerContext | null,
): ResolvedPartnerContinueContext {
  const authoritative = Boolean(server?.partnerId && server?.policyId);
  const partnerId = (authoritative ? server!.partnerId : url.partnerId).trim();
  const policyId = (authoritative ? server!.policyId : url.policyId).trim();
  const purpose = authoritative
    ? derivePurposeFromAuthoritativePolicy({
      partnerId,
      policyId,
      urlPurpose: url.purpose,
    })
    : (url.purpose?.trim() || null);

  const isDobFirstBrowse = isGoodTroubleBrowseFlow({
    partnerId,
    policyId,
    purpose,
  });

  return {
    partnerId,
    policyId,
    purpose,
    returnUrl: url.returnUrl,
    verifyRequestId: url.verifyRequestId,
    isDobFirstBrowse,
    authoritative,
  };
}
