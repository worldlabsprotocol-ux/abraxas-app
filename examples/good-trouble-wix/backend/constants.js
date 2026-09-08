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
 * Browser-safe constants live in the public module so Wix page code
 * never imports from a backend-only file.
 */
export {
  GTB_PARAM,
  GTV_PARAM,
  BROWSE_ACCESS_STORAGE_KEY,
  BROWSE_RETURN_DESTINATION_STORAGE_KEY,
  BROWSE_VERIFIER_STORAGE_PREFIX,
  PURCHASE_RETURN_DESTINATION_STORAGE_KEY,
  PURCHASE_VERIFIED_SESSION_FLAG,
  PURCHASE_VERIFIER_STORAGE_PREFIX,
  PILOT_VERIFIED_SESSION_FLAG,
  RETURN_DESTINATION_STORAGE_KEY,
  VERIFIER_STORAGE_PREFIX,
} from "../public/abraxasClientConstants.js";

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