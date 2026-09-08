// FILE: examples/good-trouble-wix/backend/checkoutAuthorization.js
// Regulated checkout requires authoritative L2+ receipt — never browse or client flags.

import { rejectBrowseReceiptForCheckout } from "./browseReceiptValidator.js";
import { validateSandboxReceipt } from "./abraxasReceiptValidator.js";
import { PILOT_VERIFIED_SESSION_FLAG } from "./constants.js";

/**
 * Fail closed when checkout is attempted with non-authoritative signals.
 * @param {{
 *   receipt?: unknown,
 *   urlStatus?: string | null,
 *   sessionStoragePilotFlag?: string | null,
 *   selfAttestedBrowseOnly?: boolean,
 * }} input
 * @returns {{ authorized: boolean, code?: string }}
 */
export function authorizeRegulatedCheckout(input) {
  if (input.urlStatus === "approved") {
    return { authorized: false, code: "url_status_not_authoritative" };
  }
  if (input.sessionStoragePilotFlag) {
    return { authorized: false, code: "session_flag_not_authoritative" };
  }
  if (input.selfAttestedBrowseOnly) {
    return { authorized: false, code: "self_attestation_not_checkout" };
  }

  const browseReject = rejectBrowseReceiptForCheckout(input.receipt);
  if (browseReject.code !== "requires_authoritative_receipt") {
    return { authorized: false, code: browseReject.code };
  }

  const sandbox = validateSandboxReceipt(input.receipt);
  if (!sandbox.verified) {
    return { authorized: false, code: "authoritative_receipt_invalid" };
  }

  return { authorized: true };
}

export function isPilotSessionFlagAuthoritative() {
  return false;
}

export { PILOT_VERIFIED_SESSION_FLAG };
