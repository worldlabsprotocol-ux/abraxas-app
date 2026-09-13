// FILE: examples/good-trouble-wix/backend/constants.js
// Shared Good Trouble × Abraxas backend integration constants.

export const ABRAXAS_ORIGIN =
  "https://abraxasworld.xyz";

export const PARTNER_ID =
  "good-trouble-cannabis";

export const POLICY_ID =
  "good-trouble-retail-v1";

/** Tier 1 browse policy — L0 self-attestation only (not purchase). */
export const BROWSE_POLICY_ID =
  "good-trouble-browse-v1";

export const FLOW_PURPOSE_BROWSE = "browse";
export const FLOW_PURPOSE_PURCHASE = "purchase";

/** Purchase / regulated eligibility callback. */
export const PURCHASE_RETURN_URL_BASE =
  "https://www.goodtroublecanna.com/age-verification-result";

/** Browse / L0 self-attestation callback — separate from purchase. */
export const BROWSE_RETURN_URL_BASE =
  "https://www.goodtroublecanna.com/browse-verification-result";

/** @deprecated Use PURCHASE_RETURN_URL_BASE */
export const RETURN_URL_BASE = PURCHASE_RETURN_URL_BASE;

export const NONCE_COLLECTION =
  "AbraxasVerificationNonces";

/**
 * Verification-flow lifetime: 10 minutes.
 */
export const FLOW_TTL_MS =
  10 * 60 * 1000;

/**
 * Maximum period for claiming a pending validation operation.
 */
export const CLAIM_TTL_MS =
  2 * 60 * 1000;

/**
 * Bounded receipt-fetch retries while the flow remains pending.
 * A temporary fetch failure must never grant verification.
 */
export const MAX_VALIDATION_ATTEMPTS = 3;

/**
 * Soft limit on concurrent pending verification flows.
 */
export const MAX_OUTSTANDING_PENDING_FLOWS = 100;

/**
 * Consumed flow records may be purged after 24 hours.
 */
export const CONSUMED_FLOW_RETENTION_MS =
  24 * 60 * 60 * 1000;

/**
 * Callback query-param names — duplicated here so Wix backend modules never
 * import from ../public (Wix Velo backend cannot resolve public re-exports).
 * Keep values in sync with public/abraxasClientConstants.js.
 */
export const GTV_PARAM = "gtv";
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

/** L0 browse UI flag — sessionStorage only. */
export const BROWSE_ACCESS_STORAGE_KEY = "good_trouble_browse_access_l0";

/** Purchase pilot UI convenience flag — sessionStorage only. */
export const PURCHASE_VERIFIED_SESSION_FLAG = "good_trouble_purchase_verified_pilot";

/** @deprecated Use PURCHASE_VERIFIED_SESSION_FLAG */
export const PILOT_VERIFIED_SESSION_FLAG = PURCHASE_VERIFIED_SESSION_FLAG;

/**
 * The current Good Trouble pilot uses sandbox receipt validation.
 * This is not production-authoritative age verification.
 */
export const RECEIPT_VALIDATION_MODE =
  "sandbox";

export const FLOW_ID_PREFIX_PURCHASE = "gtf_";
export const FLOW_ID_PREFIX_BROWSE = "gtb_";

/** @deprecated Use FLOW_ID_PREFIX_PURCHASE */
export const FLOW_ID_PREFIX = FLOW_ID_PREFIX_PURCHASE;

export const VERIFIER_BYTES = 32;

/** Purchase (gtf_) and browse (gtb_) opaque flow identifiers. */
export const FLOW_ID_RE = /^(gtf|gtb)_[a-f0-9]{64}$/;

/**
 * High-entropy verifier:
 * 64 lowercase hexadecimal characters representing 32 bytes.
 */
export const VERIFIER_RE =
  /^[a-f0-9]{64}$/;

/**
 * Abraxas decision-receipt identifier.
 */
export const RECEIPT_ID_RE =
  /^dr_[A-Za-z0-9_-]{8,128}$/;

export const MAX_INPUT_LENGTH = {
  flowId: 80,
  verifier: 128,
  receiptId: 200,
};

/**
 * Backend verification-flow lifecycle states.
 */
export const NONCE_STATE = {
  PENDING: "pending",
  VALIDATING: "validating",
  CONSUMED: "consumed",
};

/**
 * Legacy alias retained for existing integration documentation.
 */
export const NONCE_TTL_MS =
  FLOW_TTL_MS;