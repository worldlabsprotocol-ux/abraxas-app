// FILE: lib/partner/resolvePartnerContinueContext.ts
// Authoritative partner /continue flow context — server policy wins over loose URL params.

import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import { isGoodTroubleBrowseFlow } from "@/lib/partner/goodTroubleBrowseFlow";
import { normalizePartnerVerifyInput } from "@/lib/partner/normalizePartnerVerifyInput";

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
  purpose?: string | null;
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
  let urlPartnerId = url.partnerId.trim();
  let urlPolicyId = url.policyId.trim();
  let urlPurpose = url.purpose;

  if (!server?.policyId && urlPartnerId && url.returnUrl) {
    const normalized = normalizePartnerVerifyInput({
      partnerId: urlPartnerId,
      policyId: urlPolicyId,
      purpose: urlPurpose,
      returnUrl: url.returnUrl,
    });
    if (normalized.ok) {
      urlPartnerId = normalized.params.partnerId;
      urlPolicyId = normalized.params.policyId;
      urlPurpose = normalized.params.purpose ?? urlPurpose;
    }
  }

  const authoritative = Boolean(server?.partnerId && server?.policyId);
  const partnerId = (authoritative ? server!.partnerId : urlPartnerId).trim();
  const policyId = (authoritative ? server!.policyId : urlPolicyId).trim();
  const storedPurpose = authoritative ? server?.purpose?.trim() || null : null;
  const purpose = storedPurpose
    ?? derivePurposeFromAuthoritativePolicy({
      partnerId,
      policyId,
      urlPurpose,
    });

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
