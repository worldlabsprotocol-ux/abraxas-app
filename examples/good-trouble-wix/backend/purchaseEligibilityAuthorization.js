// FILE: examples/good-trouble-wix/backend/purchaseEligibilityAuthorization.js
// Server-validated, fresh, consumed, partner-bound, purpose-bound L2+ purchase gate.

import { rejectBrowseReceiptForCheckout } from "./browseReceiptValidator.js";
import { validateSandboxReceipt } from "./abraxasReceiptValidator.js";
import {
  BROWSE_ACCESS_STORAGE_KEY,
  FLOW_PURPOSE_PURCHASE,
  PARTNER_ID,
  POLICY_ID,
  PURCHASE_VERIFIED_SESSION_FLAG,
} from "./constants.js";

const MIN_PURCHASE_ASSURANCE = 2;

function assuranceRank(level) {
  if (level === "L0") return 0;
  if (level === "L1") return 1;
  if (level === "L2") return 2;
  if (level === "L3") return 3;
  if (level === "L4") return 4;
  return -1;
}

/**
 * @param {{
 *   receipt?: unknown,
 *   flowPurpose?: string | null,
 *   flowConsumed?: boolean,
 *   flowPolicyId?: string | null,
 *   urlStatus?: string | null,
 *   urlPolicyId?: string | null,
 *   urlPurpose?: string | null,
 *   sessionStoragePurchaseFlag?: string | null,
 *   sessionStorageBrowseFlag?: string | null,
 *   selfAttestedBrowseOnly?: boolean,
 *   now?: Date,
 * }} input
 * @returns {{ authorized: boolean, code?: string }}
 */
export function authorizePurchaseEligibility(input) {
  const now = input.now ?? new Date();

  if (input.urlStatus === "approved") {
    return { authorized: false, code: "url_status_not_authoritative" };
  }
  if (input.sessionStoragePurchaseFlag) {
    return { authorized: false, code: "session_flag_not_authoritative" };
  }
  if (input.sessionStorageBrowseFlag) {
    return { authorized: false, code: "browse_session_flag_not_checkout" };
  }
  if (input.selfAttestedBrowseOnly) {
    return { authorized: false, code: "self_attestation_not_checkout" };
  }
  if (input.urlPurpose === "browse") {
    return { authorized: false, code: "url_purpose_browse_not_purchase" };
  }
  if (input.urlPolicyId && input.urlPolicyId !== POLICY_ID) {
    return { authorized: false, code: "url_policy_mismatch" };
  }
  if (input.flowPurpose && input.flowPurpose !== FLOW_PURPOSE_PURCHASE) {
    return { authorized: false, code: "flow_purpose_mismatch" };
  }
  if (input.flowPolicyId && input.flowPolicyId !== POLICY_ID) {
    return { authorized: false, code: "flow_policy_mismatch" };
  }
  if (input.flowConsumed !== true) {
    return { authorized: false, code: "flow_not_consumed" };
  }

  const browseReject = rejectBrowseReceiptForCheckout(input.receipt);
  if (browseReject.code !== "requires_authoritative_receipt") {
    return { authorized: false, code: browseReject.code };
  }

  const sandbox = validateSandboxReceipt(input.receipt, { now });
  if (!sandbox.verified) {
    return { authorized: false, code: "authoritative_receipt_invalid" };
  }

  const record = input.receipt && typeof input.receipt === "object"
    ? input.receipt
    : null;
  if (!record) {
    return { authorized: false, code: "receipt_missing" };
  }
  if (record.partner_id !== PARTNER_ID) {
    return { authorized: false, code: "partner_mismatch" };
  }
  if (record.policy_id !== POLICY_ID) {
    return { authorized: false, code: "policy_mismatch" };
  }
  if (record.purpose === "browse") {
    return { authorized: false, code: "receipt_purpose_browse" };
  }

  const assurance = record.assurance_level ?? record.minimum_assurance;
  if (assurance && assuranceRank(String(assurance)) < MIN_PURCHASE_ASSURANCE) {
    return { authorized: false, code: "insufficient_assurance" };
  }

  return { authorized: true };
}

export {
  BROWSE_ACCESS_STORAGE_KEY,
  PURCHASE_VERIFIED_SESSION_FLAG,
};
