// FILE: examples/good-trouble-wix/public/abraxasClientConstants.js
// Browser-safe constants for Wix client page code and public modules.
// Do not add secrets, validation modes, partner security config, or receipt controls here.

/** Opaque flow id query param on the Good Trouble callback URL (never the PKCE verifier). */
export const GTV_PARAM = "gtv";

/** sessionStorage key prefix — verifier stored as `${VERIFIER_STORAGE_PREFIX}${flowId}`. */
export const VERIFIER_STORAGE_PREFIX = "abraxas_gt_verifier_";

/** Session-only return destination saved before Abraxas redirect (same-origin path). */
export const RETURN_DESTINATION_STORAGE_KEY = "good_trouble_return_destination";

/**
 * Pilot UI convenience flag — sessionStorage only.
 * NOT authoritative; never read by Abraxas or Wix backend web methods.
 */
export const PILOT_VERIFIED_SESSION_FLAG = "good_trouble_age_verified_pilot";
