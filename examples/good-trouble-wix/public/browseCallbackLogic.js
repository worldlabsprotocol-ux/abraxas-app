// FILE: examples/good-trouble-wix/public/browseCallbackLogic.js
// Wix deployment: src/public/browseCallbackLogic.js

import {
  GOOD_TROUBLE_THE_GOODS_SHOP_PATH,
  PURCHASE_POST_VERIFICATION_FALLBACK,
} from "./abraxasClientConstants.js";
import {
  extractSameOriginPath,
  isSafeReturnDestinationPath,
  normalizeReturnDestinationPath,
} from "./purchaseReturnDestination.js";

export const CHECKING_BROWSE_MESSAGE = "Confirming browsing access…";
export const BROWSE_SUCCESS_MESSAGE = "Verification confirmed";
export const BROWSE_POST_VERIFICATION_FALLBACK = GOOD_TROUBLE_THE_GOODS_SHOP_PATH;
export const POST_BROWSE_REDIRECT_DELAY_MS = 1200;
/** Max time to remain on "Confirming…" before fail-closed restart (ms). */
export const BROWSE_CALLBACK_COMPLETION_TIMEOUT_MS = 90_000;
export const BROWSE_CALLBACK_TRANSIENT_RETRY_MS = 2000;
export const BROWSE_CALLBACK_MAX_TRANSIENT_RETRIES = 15;

/** @deprecated Use BROWSE_POST_VERIFICATION_FALLBACK */
export const BROWSE_POST_VERIFICATION_FALLBACK_LEGACY = PURCHASE_POST_VERIFICATION_FALLBACK;

/**
 * @param {{
 *   verified?: boolean,
 *   purpose?: string,
 * }} result
 */
export function shouldContinueAfterBrowseVerification(result) {
  return result?.verified === true && result?.purpose === "browse";
}

/**
 * @param {{
 *   serverDestination?: string | null,
 *   sessionDestination?: string | null,
 * }} input
 * @returns {string}
 */
export function resolveBrowsePostVerificationRedirectDestination(input) {
  const fromServer = normalizeReturnDestinationPath(input.serverDestination);
  if (fromServer) return fromServer;

  const fromSession = normalizeReturnDestinationPath(input.sessionDestination);
  if (fromSession) return fromSession;

  return BROWSE_POST_VERIFICATION_FALLBACK;
}

/**
 * @param {string} destination
 * @returns {boolean}
 */
export function canRedirectAfterBrowseVerification(destination) {
  return isSafeReturnDestinationPath(destination)
    || destination === BROWSE_POST_VERIFICATION_FALLBACK;
}

export {
  parseAllowlistedCallbackParams,
} from "./purchaseCallbackLogic.js";

export {
  extractSameOriginPath,
  normalizeReturnDestinationPath,
} from "./purchaseReturnDestination.js";

/**
 * @param {{ currentUrl?: string | null }} input
 * @returns {string}
 */
export function resolveBrowseReturnDestinationForStart(input) {
  const fromCurrent = extractSameOriginPath(input.currentUrl);
  if (fromCurrent) return fromCurrent;
  return BROWSE_POST_VERIFICATION_FALLBACK;
}
