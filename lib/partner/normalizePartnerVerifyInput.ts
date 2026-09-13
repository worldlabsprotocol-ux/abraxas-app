// FILE: lib/partner/normalizePartnerVerifyInput.ts
// Authoritative /partner/verify input normalization — legacy Good Trouble browse links.

import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";

export const GOOD_TROUBLE_LEGACY_BROWSE_INVALID_LINK_MESSAGE =
  "This verification link is invalid. Return to Good Trouble and try again.";

export const GOOD_TROUBLE_BROWSE_CALLBACK_PATH = "/browse-verification-result";
export const GOOD_TROUBLE_PURCHASE_CALLBACK_PATH = "/age-verification-result";
export const GOOD_TROUBLE_RETURN_HOST = "www.goodtroublecanna.com";
export const GOOD_TROUBLE_GTB_PARAM = "gtb";
export const GOOD_TROUBLE_GTV_PARAM = "gtv";

/** Purchase (gtf_) and browse (gtb_) opaque flow identifiers — matches Wix backend validation. */
export const GOOD_TROUBLE_FLOW_ID_RE = /^(gtf|gtb)_[a-f0-9]{64}$/;

export type PartnerVerifyNormalizedParams = {
  partnerId: string;
  policyId: string;
  returnUrl: string;
  purpose?: string;
  permission?: string;
  permissionVersion?: string;
};

export type NormalizePartnerVerifyInputResult =
  | { ok: true; params: PartnerVerifyNormalizedParams; legacyBrowseNormalized: boolean }
  | { ok: false; code: string; invalidLinkMessage: string };

function failGoodTroubleInvalid(code: string): NormalizePartnerVerifyInputResult {
  return {
    ok: false,
    code,
    invalidLinkMessage: GOOD_TROUBLE_LEGACY_BROWSE_INVALID_LINK_MESSAGE,
  };
}

function parseHttpsReturnUrl(returnUrl: string): URL | null {
  try {
    const parsed = new URL(returnUrl.trim());
    if (parsed.protocol !== "https:") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function extractGoodTroubleGtbFlowId(returnUrl: string): string | null {
  const parsed = parseHttpsReturnUrl(returnUrl);
  if (!parsed) return null;
  const gtb = parsed.searchParams.get(GOOD_TROUBLE_GTB_PARAM)?.trim();
  if (!gtb || !gtb.startsWith("gtb_")) return null;
  if (!GOOD_TROUBLE_FLOW_ID_RE.test(gtb)) return null;
  return gtb;
}

export function isLegacyGoodTroubleBrowseReturnUrl(returnUrl: string): boolean {
  const parsed = parseHttpsReturnUrl(returnUrl);
  if (!parsed) return false;
  if (parsed.hostname !== GOOD_TROUBLE_RETURN_HOST) return false;
  if (parsed.pathname !== GOOD_TROUBLE_BROWSE_CALLBACK_PATH) return false;
  return extractGoodTroubleGtbFlowId(returnUrl) !== null;
}

function isGoodTroublePurchaseReturnUrl(returnUrl: string): boolean {
  const parsed = parseHttpsReturnUrl(returnUrl);
  if (!parsed) return false;
  if (parsed.pathname === GOOD_TROUBLE_PURCHASE_CALLBACK_PATH) return true;
  const gtv = parsed.searchParams.get(GOOD_TROUBLE_GTV_PARAM)?.trim();
  if (gtv?.startsWith("gtf_")) return true;
  return returnUrl.toLowerCase().includes("gtf_");
}

function missingGenericMessage(missing: string[]): string {
  return `This verification link is missing required parameters (${missing.join(", ")}). Ask the partner site for a fresh Partner Flow link.`;
}

/**
 * Single authoritative normalization for /partner/verify query input.
 * Infers legacy Good Trouble browse tuple only when every safety condition matches.
 */
export function normalizePartnerVerifyInput(input: {
  partnerId?: string | null;
  relyingPartyId?: string | null;
  policyId?: string | null;
  purpose?: string | null;
  returnUrl?: string | null;
  permission?: string | null;
  permissionVersion?: string | null;
}): NormalizePartnerVerifyInputResult {
  const partnerId = (input.partnerId ?? input.relyingPartyId ?? "").trim();
  const returnUrl = (input.returnUrl ?? "").trim();
  const policyId = (input.policyId ?? "").trim();
  const purpose = (input.purpose ?? "").trim();
  const permission = (input.permission ?? "").trim();
  const permissionVersion = (input.permissionVersion ?? "").trim();

  const missing: string[] = [];
  if (!partnerId) missing.push("partner identifier");
  if (!returnUrl) missing.push("return URL");
  if (missing.length > 0) {
    return {
      ok: false,
      code: "missing_required_params",
      invalidLinkMessage: missingGenericMessage(missing),
    };
  }

  const isGoodTrouble = partnerId === GOOD_TROUBLE_PARTNER_ID;
  const parsedReturn = parseHttpsReturnUrl(returnUrl);

  if (isGoodTrouble) {
    if (
      parsedReturn?.pathname === GOOD_TROUBLE_BROWSE_CALLBACK_PATH
      && parsedReturn.hostname !== GOOD_TROUBLE_RETURN_HOST
    ) {
      return failGoodTroubleInvalid("foreign_return_host");
    }

    if (
      policyId === GOOD_TROUBLE_RETAIL_POLICY_ID
      && (purpose === "browse" || parsedReturn?.pathname === GOOD_TROUBLE_BROWSE_CALLBACK_PATH)
    ) {
      return failGoodTroubleInvalid("tuple_conflict");
    }

    if (
      policyId === GOOD_TROUBLE_BROWSE_POLICY_ID
      && (purpose === "purchase" || parsedReturn?.pathname === GOOD_TROUBLE_PURCHASE_CALLBACK_PATH)
    ) {
      return failGoodTroubleInvalid("tuple_conflict");
    }

    if (!policyId && !purpose && !permission) {
      if (parsedReturn && parsedReturn.hostname !== GOOD_TROUBLE_RETURN_HOST) {
        return failGoodTroubleInvalid("foreign_return_host");
      }

      if (isGoodTroublePurchaseReturnUrl(returnUrl)) {
        return failGoodTroubleInvalid("purchase_callback");
      }

      if (isLegacyGoodTroubleBrowseReturnUrl(returnUrl)) {
        return {
          ok: true,
          legacyBrowseNormalized: true,
          params: {
            partnerId,
            policyId: GOOD_TROUBLE_BROWSE_POLICY_ID,
            purpose: "browse",
            returnUrl,
          },
        };
      }

      if (parsedReturn?.pathname === GOOD_TROUBLE_BROWSE_CALLBACK_PATH) {
        return failGoodTroubleInvalid("malformed_gtb");
      }

      return failGoodTroubleInvalid("missing_policy");
    }

    if (
      !policyId
      && isGoodTroublePurchaseReturnUrl(returnUrl)
      && !permission
    ) {
      return failGoodTroubleInvalid("purchase_callback");
    }

    if (
      parsedReturn?.pathname === GOOD_TROUBLE_BROWSE_CALLBACK_PATH
      && !extractGoodTroubleGtbFlowId(returnUrl)
      && policyId !== GOOD_TROUBLE_BROWSE_POLICY_ID
    ) {
      return failGoodTroubleInvalid("malformed_gtb");
    }
  }

  if (!policyId && !permission) {
    return {
      ok: false,
      code: "missing_policy",
      invalidLinkMessage: isGoodTrouble
        ? GOOD_TROUBLE_LEGACY_BROWSE_INVALID_LINK_MESSAGE
        : missingGenericMessage(["policy or permission"]),
    };
  }

  return {
    ok: true,
    legacyBrowseNormalized: false,
    params: {
      partnerId,
      policyId,
      returnUrl,
      purpose: purpose || undefined,
      permission: permission || undefined,
      permissionVersion: permissionVersion || undefined,
    },
  };
}

export function normalizePartnerVerifySearchParams(
  searchParams: URLSearchParams,
): NormalizePartnerVerifyInputResult {
  return normalizePartnerVerifyInput({
    partnerId: searchParams.get("partner_id"),
    relyingPartyId: searchParams.get("relying_party_id"),
    policyId: searchParams.get("policy_id"),
    purpose: searchParams.get("purpose"),
    returnUrl: searchParams.get("return_url"),
    permission: searchParams.get("permission"),
    permissionVersion: searchParams.get("permission_version"),
  });
}
