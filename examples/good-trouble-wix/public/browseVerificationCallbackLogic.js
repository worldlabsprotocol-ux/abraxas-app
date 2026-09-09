// FILE: examples/good-trouble-wix/public/browseVerificationCallbackLogic.js
// Testable browse callback orchestration — never trusts URL success signals.

import { GTB_PARAM } from "./abraxasClientConstants.js";

/** Params the callback page may read from the URL (receipt + flow binding only). */
export const ALLOWED_BROWSE_CALLBACK_PARAMS = new Set([
  "browse_receipt",
  "partner_id",
  "policy_id",
  "purpose",
  GTB_PARAM,
]);

export const BROWSE_CALLBACK_RESTART_MESSAGE =
  "This verification was opened in a different browser or tab. Please start again from the age gate.";

export const BROWSE_CALLBACK_GENERIC_FAILURE =
  "Browsing access could not be confirmed. Please try again.";

export const BROWSE_CALLBACK_SUCCESS_MESSAGE =
  "Browsing access confirmed. Returning you to Good Trouble…";

/**
 * @param {Record<string, unknown>} query
 * @returns {Record<string, string>}
 */
export function parseAllowlistedBrowseCallbackParams(query) {
  const parsed = {};
  for (const key of Object.keys(query)) {
    if (ALLOWED_BROWSE_CALLBACK_PARAMS.has(key) && typeof query[key] === "string") {
      parsed[key] = query[key];
    }
  }
  return parsed;
}

/**
 * @param {Record<string, string>} params
 * @returns {{ flowId: string, browseReceipt: string }}
 */
export function extractBrowseCallbackInputs(params) {
  const flowId = typeof params[GTB_PARAM] === "string" ? params[GTB_PARAM].trim() : "";
  const browseReceipt = typeof params.browse_receipt === "string" ? params.browse_receipt.trim() : "";
  return { flowId, browseReceipt };
}

/**
 * Success is determined only from backend verification — never URL purpose/policy/age_band.
 * @param {{ verified?: boolean, purpose?: string } | null | undefined} result
 * @returns {boolean}
 */
export function isBackendBrowseVerificationSuccess(result) {
  return result?.verified === true && result?.purpose === "browse";
}

/**
 * @param {{ retryable?: boolean, verified?: boolean, purpose?: string } | null | undefined} result
 * @returns {boolean}
 */
export function shouldRetainVerifierForRetry(result) {
  return result?.retryable === true && !isBackendBrowseVerificationSuccess(result);
}

/**
 * @param {string | null | undefined} destination
 * @returns {string}
 */
export function resolveSafeReturnDestination(destination) {
  if (
    destination
    && typeof destination === "string"
    && destination.startsWith("/")
    && !destination.startsWith("//")
  ) {
    return destination;
  }
  return "/";
}

/**
 * @param {string} verifierStorageKey
 * @param {{ getItem: (key: string) => string | null, removeItem: (key: string) => void }} sessionStorage
 * @param {string} flowId
 */
export function clearFlowVerifier(verifierStorageKey, sessionStorage, flowId) {
  try {
    sessionStorage.removeItem(verifierStorageKey(flowId));
  } catch {
    // Non-authoritative cleanup.
  }
}
