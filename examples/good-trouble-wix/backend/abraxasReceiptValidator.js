// FILE: examples/good-trouble-wix/backend/abraxasReceiptValidator.js
// Strict Partner Flow public receipt validation for Good Trouble Wix sandbox.
// Mirror lib/partner/verifyPartnerFlowReceipt.ts — keep in sync manually.

import {
  GOOD_TROUBLE_SANDBOX_POLICY_VERSION,
  RECEIPT_VALIDATION_MODE,
} from "./constants.js";

const ABRAXAS_ORIGIN = "https://abraxasworld.xyz";
const EXPECTED_PARTNER_ID = "good-trouble";
const EXPECTED_POLICY_ID = "good-trouble-age_21_retail-v1";
const SUPPORTED_SCHEMA_VERSION = "1.0.0";
const EXPECTED_ARTIFACT_TYPE = "eligibility_decision_receipt";
const SANDBOX_ONLY_INVALIDATION_REASON = "production_not_usable:false";
const RECEIPT_ID_RE = /^dr_[A-Za-z0-9_-]{8,128}$/;

export { RECEIPT_VALIDATION_MODE };

function isPilotAgeEligibilityReceipt(receipt) {
  return (receipt.evaluated_claim_refs ?? []).some(
    (ref) => ref.claim_type === "self_attested_age_band",
  );
}

function sharedErrors(receipt, now) {
  const errors = [];
  if (receipt.signature_valid !== true) errors.push("signature_invalid");
  if (receipt.decision_result !== "approved") errors.push(`decision_not_approved:${receipt.decision_result ?? "missing"}`);
  if (receipt.status !== "active") errors.push(`status_not_active:${receipt.status ?? "missing"}`);
  if (receipt.partner_id !== EXPECTED_PARTNER_ID) errors.push("partner_mismatch");
  if (receipt.policy_id !== EXPECTED_POLICY_ID) errors.push("policy_mismatch");
  if (
    receipt.policy_version != null
    && Number(receipt.policy_version) !== GOOD_TROUBLE_SANDBOX_POLICY_VERSION
  ) {
    errors.push("policy_version_mismatch");
  }
  if (receipt.schema_version !== SUPPORTED_SCHEMA_VERSION) errors.push("schema_version_unsupported");
  if (receipt.artifact_type !== EXPECTED_ARTIFACT_TYPE) errors.push("artifact_type_mismatch");
  if (receipt.artifact_type === "browse_access_receipt") {
    errors.push("browse_receipt_not_purchase_authority");
  }
  if (receipt.valid_for_purchase === false) errors.push("not_valid_for_purchase");
  if (receipt.purpose === "browse") errors.push("browse_purpose_not_checkout");
  if (receipt.assurance_level === "L0" && !isPilotAgeEligibilityReceipt(receipt)) {
    errors.push("l0_not_checkout_authority");
  }
  if (isPilotAgeEligibilityReceipt(receipt)) {
    const hasIdentityClaim = (receipt.evaluated_claim_refs ?? []).some(
      (ref) => ref.claim_type === "identity_verified" || ref.claim_type === "liveness_passed",
    );
    if (hasIdentityClaim) errors.push("pilot_receipt_must_not_claim_identity");
  }

  if (!receipt.expires_at) {
    errors.push("expires_at_missing");
  } else {
    const expiresAt = Date.parse(receipt.expires_at);
    if (!Number.isFinite(expiresAt)) errors.push("expires_at_invalid");
    else if (expiresAt <= now.getTime()) errors.push("receipt_expired");
  }

  for (const ref of receipt.evaluated_claim_refs ?? []) {
    const status = (ref.status ?? "").toLowerCase();
    if (status && status !== "active") errors.push(`claim_not_active:${ref.claim_type ?? "unknown"}`);
  }

  return errors;
}

function sandboxErrors(receipt) {
  const errors = [];
  if (receipt.production_usable !== false) {
    errors.push(receipt.production_usable === undefined
      ? "sandbox_production_usable_missing"
      : "sandbox_production_usable_not_false");
  }
  if (receipt.decision_context !== "sandbox_only") errors.push("sandbox_decision_context_mismatch");
  const reasons = receipt.invalidation_reasons ?? [];
  if (reasons.length !== 1 || reasons[0] !== SANDBOX_ONLY_INVALIDATION_REASON) {
    errors.push("sandbox_invalidation_reason_mismatch");
  }
  return errors;
}

function productionErrors(receipt) {
  const errors = [];
  if (receipt.production_usable !== true) {
    errors.push(receipt.production_usable === undefined
      ? "production_usable_missing"
      : "production_usable_not_true");
  }
  if (receipt.currently_valid !== true) errors.push("currently_valid_not_true");
  if (receipt.decision_context !== "production") errors.push("production_decision_context_mismatch");
  if ((receipt.invalidation_reasons ?? []).length > 0) errors.push("production_has_invalidation_reasons");
  return errors;
}

/**
 * @param {unknown} receipt
 * @returns {"sandbox" | "production"}
 */
export function resolvePurchaseReceiptValidationMode(receipt) {
  if (!receipt || typeof receipt !== "object") return RECEIPT_VALIDATION_MODE;
  if (receipt.decision_context === "production" || receipt.production_usable === true) {
    return "production";
  }
  return "sandbox";
}

/**
 * @param {unknown} receipt
 * @param {{ now?: Date, mode?: "sandbox" | "production" }} [opts]
 * @returns {{ verified: boolean }}
 */
export function validateSandboxReceipt(receipt, opts = {}) {
  const now = opts.now ?? new Date();
  if (!receipt || typeof receipt !== "object") return { verified: false };
  const errors = [...sharedErrors(receipt, now), ...sandboxErrors(receipt)];
  return { verified: errors.length === 0 };
}

/**
 * @param {unknown} receipt
 * @param {{ now?: Date }} [opts]
 * @returns {{ verified: boolean }}
 */
export function validateProductionReceipt(receipt, opts = {}) {
  const now = opts.now ?? new Date();
  if (!receipt || typeof receipt !== "object") return { verified: false };
  const errors = [...sharedErrors(receipt, now), ...productionErrors(receipt)];
  return { verified: errors.length === 0 };
}

/**
 * @param {string} receiptId
 * @returns {Promise<{ verified: boolean, mode: "sandbox" | "production", expires_at?: string | null, transientFailure?: boolean }>}
 */
export async function fetchAndValidatePurchaseReceipt(receiptId) {
  const id = typeof receiptId === "string" ? receiptId.trim() : "";
  if (!id || id.length > 200 || !RECEIPT_ID_RE.test(id)) {
    return { verified: false, mode: RECEIPT_VALIDATION_MODE };
  }

  let response;
  try {
    response = await fetch(
      `${ABRAXAS_ORIGIN}/api/receipts/${encodeURIComponent(id)}/public`,
      { method: "GET", headers: { Accept: "application/json" } },
    );
  } catch {
    return { verified: false, mode: RECEIPT_VALIDATION_MODE, transientFailure: true };
  }

  if (!response.ok) {
    return {
      verified: false,
      mode: RECEIPT_VALIDATION_MODE,
      transientFailure: response.status >= 500,
    };
  }

  let receipt;
  try {
    receipt = await response.json();
  } catch {
    return { verified: false, mode: RECEIPT_VALIDATION_MODE };
  }

  const mode = resolvePurchaseReceiptValidationMode(receipt);
  const result = mode === "production"
    ? validateProductionReceipt(receipt)
    : validateSandboxReceipt(receipt);
  return {
    ...result,
    mode,
    expires_at: typeof receipt.expires_at === "string" ? receipt.expires_at : null,
  };
}

/** @deprecated Use fetchAndValidatePurchaseReceipt */
export async function fetchAndValidateSandboxReceipt(receiptId) {
  return fetchAndValidatePurchaseReceipt(receiptId);
}
