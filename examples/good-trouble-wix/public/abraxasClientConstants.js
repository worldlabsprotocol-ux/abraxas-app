// FILE: examples/good-trouble-wix/public/abraxasClientConstants.js
// Browser-safe constants for Wix client page code and public modules.
// Do not add secrets, validation modes, partner security config, or receipt controls here.

/** Purchase flow id query param on the purchase callback URL (never the PKCE verifier). */
export const GTV_PARAM = "gtv";

/** Browse flow id query param on the browse callback URL (never the PKCE verifier). */
export const GTB_PARAM = "gtb";

/** Purchase verifier prefix — `${PURCHASE_VERIFIER_STORAGE_PREFIX}${flowId}`. */
export const PURCHASE_VERIFIER_STORAGE_PREFIX = "abraxas_gt_purchase_verifier_";

/** Browse verifier prefix — `${BROWSE_VERIFIER_STORAGE_PREFIX}${flowId}`. */
export const BROWSE_VERIFIER_STORAGE_PREFIX = "abraxas_gt_browse_verifier_";

/** @deprecated Use PURCHASE_VERIFIER_STORAGE_PREFIX */
export const VERIFIER_STORAGE_PREFIX = PURCHASE_VERIFIER_STORAGE_PREFIX;

/** Purchase return destination saved before Abraxas redirect (same-origin path). */
export const PURCHASE_RETURN_DESTINATION_STORAGE_KEY = "good_trouble_return_destination_purchase";

/** Browse return destination saved before Abraxas browse redirect. */
export const BROWSE_RETURN_DESTINATION_STORAGE_KEY = "good_trouble_return_destination_browse";

/** @deprecated Use PURCHASE_RETURN_DESTINATION_STORAGE_KEY */
export const RETURN_DESTINATION_STORAGE_KEY = PURCHASE_RETURN_DESTINATION_STORAGE_KEY;

/**
 * L0 browse UI flag — sessionStorage only.
 * May dismiss the age popup; NOT accepted for checkout authorization.
 */
export const BROWSE_ACCESS_STORAGE_KEY = "good_trouble_browse_access_l0";

/**
 * Purchase pilot UI convenience flag — sessionStorage only.
 * NOT authoritative; never read by checkout backend web methods.
 */
export const PURCHASE_VERIFIED_SESSION_FLAG = "good_trouble_purchase_verified_pilot";

/** @deprecated Use PURCHASE_VERIFIED_SESSION_FLAG */
export const PILOT_VERIFIED_SESSION_FLAG = PURCHASE_VERIFIED_SESSION_FLAG;
