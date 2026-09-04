// FILE: examples/good-trouble-wix/backend/constants.js
// Shared Good Trouble × Abraxas integration constants.

export const ABRAXAS_ORIGIN = "https://abraxasworld.xyz";
export const PARTNER_ID = "good-trouble-cannabis";
export const POLICY_ID = "good-trouble-retail-v1";
export const RETURN_URL_BASE = "https://www.goodtroublecanna.com/age-verification-result";
export const NONCE_COLLECTION = "AbraxasVerificationNonces";
/** Flow TTL — 10 minutes (within 5–15 minute operator window). */
export const FLOW_TTL_MS = 10 * 60 * 1000;
export const CLAIM_TTL_MS = 2 * 60 * 1000;
/** Bounded receipt-fetch retries while flow remains pending (never grants verification on transient failure). */
export const MAX_VALIDATION_ATTEMPTS = 3;
/** Soft cap on concurrent pending flows site-wide (after purge). */
export const MAX_OUTSTANDING_PENDING_FLOWS = 100;
/** Delete consumed flows older than this during purge (operator cleanup guidance). */
export const CONSUMED_FLOW_RETENTION_MS = 24 * 60 * 60 * 1000;
export const GTV_PARAM = "gtv";
export const RECEIPT_VALIDATION_MODE = "sandbox";
export const FLOW_ID_PREFIX = "gtf_";
export const VERIFIER_BYTES = 32;

/** Opaque flow identifier carried in callback URL (gtv param) — never the raw verifier. */
export const FLOW_ID_RE = /^gtf_[a-f0-9]{64}$/;
/** High-entropy verifier (64 hex chars = 32 bytes). */
export const VERIFIER_RE = /^[a-f0-9]{64}$/;
export const RECEIPT_ID_RE = /^dr_[A-Za-z0-9_-]{8,128}$/;

export const MAX_INPUT_LENGTH = {
  flowId: 80,
  verifier: 128,
  receiptId: 200,
};

/** sessionStorage key prefix — verifier stored as `${VERIFIER_STORAGE_PREFIX}${flowId}`. */
export const VERIFIER_STORAGE_PREFIX = "abraxas_gt_verifier_";

/** Session-only return destination saved before Abraxas redirect (same-origin path). */
export const RETURN_DESTINATION_STORAGE_KEY = "good_trouble_return_destination";

/**
 * Pilot UI convenience flag — sessionStorage only.
 * NOT authoritative; never read by Abraxas or Wix backend web methods.
 */
export const PILOT_VERIFIED_SESSION_FLAG = "good_trouble_age_verified_pilot";

/** Nonce / flow lifecycle states — backend collection only. */
export const NONCE_STATE = {
  PENDING: "pending",
  VALIDATING: "validating",
  CONSUMED: "consumed",
};

// Legacy alias for docs referencing NONCE_TTL_MS
export const NONCE_TTL_MS = FLOW_TTL_MS;
