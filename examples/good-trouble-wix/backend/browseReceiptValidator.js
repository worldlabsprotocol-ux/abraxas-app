// FILE: examples/good-trouble-wix/backend/browseReceiptValidator.js
// L0 browse-access receipt validation — UI gate only, not purchase authorization.

import { BROWSE_RECEIPT_ARTIFACT_TYPE } from "./browseConstants.js";

const EXPECTED_PARTNER_ID = "good-trouble-cannabis";
const BROWSE_POLICY_ID = "good-trouble-browse-v1";

/**
 * @param {unknown} payload
 * @param {{ now?: Date, partnerId?: string, policyId?: string }} [opts]
 * @returns {{ verified: boolean, errors: string[] }}
 */
export function validateBrowseAccessPayload(payload, opts = {}) {
  const now = opts.now ?? new Date();
  const errors = [];
  const partnerId = opts.partnerId ?? EXPECTED_PARTNER_ID;
  const policyId = opts.policyId ?? BROWSE_POLICY_ID;

  if (!payload || typeof payload !== "object") {
    return { verified: false, errors: ["payload_missing"] };
  }

  const record = payload;

  if (record.artifact_type !== BROWSE_RECEIPT_ARTIFACT_TYPE) {
    errors.push("artifact_type_mismatch");
  }
  if (record.valid_for_purchase !== false) {
    errors.push("not_browse_receipt");
  }
  if (record.purpose !== "browse") {
    errors.push("purpose_mismatch");
  }
  if (record.assurance_level !== "L0") {
    errors.push("assurance_not_l0");
  }
  if (record.partner_id !== partnerId) {
    errors.push("partner_mismatch");
  }
  if (record.policy_id !== policyId) {
    errors.push("policy_mismatch");
  }
  if (!record.expires_at) {
    errors.push("expires_at_missing");
  } else {
    const expiresAt = Date.parse(record.expires_at);
    if (!Number.isFinite(expiresAt)) errors.push("expires_at_invalid");
    else if (expiresAt <= now.getTime()) errors.push("receipt_expired");
  }

  for (const forbidden of ["date_of_birth", "dob", "legal_name", "address", "document_number"]) {
    if (forbidden in record) errors.push(`forbidden_field:${forbidden}`);
  }

  return { verified: errors.length === 0, errors };
}

/**
 * Browse receipts must never authorize regulated checkout.
 * @param {unknown} receiptOrPayload
 * @returns {{ authorized: false, code: string }}
 */
export function rejectBrowseReceiptForCheckout(receiptOrPayload) {
  if (!receiptOrPayload || typeof receiptOrPayload !== "object") {
    return { authorized: false, code: "receipt_missing" };
  }
  const record = receiptOrPayload;
  if (record.artifact_type === BROWSE_RECEIPT_ARTIFACT_TYPE) {
    return { authorized: false, code: "browse_receipt_not_valid_for_purchase" };
  }
  if (record.valid_for_purchase === false) {
    return { authorized: false, code: "not_valid_for_purchase" };
  }
  if (record.purpose === "browse") {
    return { authorized: false, code: "browse_purpose_not_checkout" };
  }
  if (record.assurance_level === "L0") {
    return { authorized: false, code: "l0_not_checkout_authority" };
  }
  return { authorized: false, code: "requires_authoritative_receipt" };
}
