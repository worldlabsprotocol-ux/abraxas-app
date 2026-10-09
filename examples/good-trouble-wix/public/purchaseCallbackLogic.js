// FILE: examples/good-trouble-wix/public/purchaseCallbackLogic.js
// Wix deployment: src/public/purchaseCallbackLogic.js

import { PURCHASE_POST_VERIFICATION_FALLBACK } from "./abraxasClientConstants.js";
import {
  isSafeReturnDestinationPath,
  normalizeReturnDestinationPath,
} from "./purchaseReturnDestination.js";

export const CHECKING_VERIFICATION_MESSAGE = "Checking verification...";
export const SUCCESS_CONTINUATION_MESSAGE = "Verification complete. Continuing your order…";
export const POST_VERIFICATION_REDIRECT_DELAY_MS = 400;

/**
 * @param {{
 *   verified?: boolean,
 *   purpose?: string,
 *   returnDestination?: string | null,
 * }} result
 */
export function shouldContinueAfterPurchaseVerification(result) {
  return result?.verified === true && result?.purpose === "purchase";
}

/**
 * @param {{
 *   serverDestination?: string | null,
 *   sessionDestination?: string | null,
 * }} input
 * @returns {string}
 */
export function resolvePostVerificationRedirectDestination(input) {
  const fromServer = normalizeReturnDestinationPath(input.serverDestination);
  if (fromServer) return fromServer;

  const fromSession = normalizeReturnDestinationPath(input.sessionDestination);
  if (fromSession) return fromSession;

  return PURCHASE_POST_VERIFICATION_FALLBACK;
}

/**
 * @param {string} destination
 * @returns {boolean}
 */
export function canRedirectToDestination(destination) {
  return isSafeReturnDestinationPath(destination)
    || destination === PURCHASE_POST_VERIFICATION_FALLBACK;
}

/**
 * @param {Record<string, unknown>} query
 * @param {Set<string>} allowedParams
 */
export function parseAllowlistedCallbackParams(query, allowedParams) {
  const parsed = {};
  for (const key of Object.keys(query ?? {})) {
    if (allowedParams.has(key)) {
      parsed[key] = query[key];
    }
  }
  return parsed;
}

export { PURCHASE_POST_VERIFICATION_FALLBACK };
