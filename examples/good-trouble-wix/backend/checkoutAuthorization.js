// FILE: examples/good-trouble-wix/backend/checkoutAuthorization.js
// Regulated checkout requires authoritative L2+ receipt — never browse or client flags.

import { authorizePurchaseEligibility } from "./purchaseEligibilityAuthorization.js";

/**
 * @param {Parameters<typeof authorizePurchaseEligibility>[0]} input
 */
export function authorizeRegulatedCheckout(input) {
  return authorizePurchaseEligibility(input);
}

export function isPilotSessionFlagAuthoritative() {
  return false;
}

export { PURCHASE_VERIFIED_SESSION_FLAG as PILOT_VERIFIED_SESSION_FLAG } from "./constants.js";
