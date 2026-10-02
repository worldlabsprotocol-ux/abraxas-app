// FILE: lib/partner/resolvePartnerContinueContext.ts
// Authoritative partner /continue flow context — server policy wins over loose URL params.

import { GOOD_TROUBLE_BROWSE_POLICY_ID } from "@/lib/goodTrouble/constants";
import {
  isGoodTroubleBrowseFlow,
  isGoodTroubleBrowsePartnerId,
} from "@/lib/partner/goodTroubleBrowseFlow";
import {
  normalizeGoodTroubleBrowseReturnUrl,
  normalizePartnerVerifyInput,
  shouldNormalizeGoodTroubleBrowseReturnUrl,
} from "@/lib/partner/normalizePartnerVerifyInput";
import { isGoodTroubleRegulatedPurchasePolicyId } from "@/lib/partner/goodTroublePurchaseFlow";
import { findProductionPolicyRules } from "@/lib/policy/productionPolicyContract";
import { isBrowseAccessPolicy } from "@/lib/policy/selfAttestationGuards";

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
  if (!isGoodTroubleBrowsePartnerId(input.partnerId)) {
    return input.urlPurpose?.trim() || null;
  }

  if (input.policyId === GOOD_TROUBLE_BROWSE_POLICY_ID) {
    return "browse";
  }

  if (isGoodTroubleRegulatedPurchasePolicyId(input.policyId)) {
    return "purchase";
  }

  return input.urlPurpose?.trim() || null;
}

/** Authoritative L0 browse — policy rules win over loose URL purpose. */
export function isAuthoritativeBrowseAccessFlow(input: {
  policyId: string;
  purpose?: string | null;
}): boolean {
  const policyId = input.policyId.trim();
  if (!policyId) return false;
  if (input.purpose?.trim() === "purchase") return false;

  if (policyId === GOOD_TROUBLE_BROWSE_POLICY_ID) return true;

  const rules = findProductionPolicyRules(policyId);
  return rules ? isBrowseAccessPolicy(rules) : false;
}

export function resolvePartnerContinueContext(
  url: PartnerContinueUrlParams,
  server?: PartnerContinueServerContext | null,
): ResolvedPartnerContinueContext {
  let urlPartnerId = url.partnerId.trim();
  let urlPolicyId = url.policyId.trim();
  let urlPurpose = url.purpose;
  let urlReturnUrl = url.returnUrl.trim();

  if (!server?.policyId && urlPartnerId && urlReturnUrl) {
    const normalized = normalizePartnerVerifyInput({
      partnerId: urlPartnerId,
      policyId: urlPolicyId,
      purpose: urlPurpose,
      returnUrl: urlReturnUrl,
    });
    if (normalized.ok) {
      urlPartnerId = normalized.params.partnerId;
      urlPolicyId = normalized.params.policyId;
      urlPurpose = normalized.params.purpose ?? urlPurpose;
      urlReturnUrl = normalized.params.returnUrl;
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
  }) || isAuthoritativeBrowseAccessFlow({ policyId, purpose });

  const returnUrl = shouldNormalizeGoodTroubleBrowseReturnUrl({
    partnerId,
    policyId,
    purpose,
    returnUrl: urlReturnUrl,
  })
    ? normalizeGoodTroubleBrowseReturnUrl(urlReturnUrl)
    : urlReturnUrl;

  return {
    partnerId,
    policyId,
    purpose,
    returnUrl,
    verifyRequestId: url.verifyRequestId,
    isDobFirstBrowse,
    authoritative,
  };
}
