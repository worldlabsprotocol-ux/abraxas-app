// FILE: examples/good-trouble-wix/backend/constants.js
// Shared Good Trouble × Abraxas integration constants.

export const ABRAXAS_ORIGIN = "https://abraxasworld.xyz";
export const PARTNER_ID = "good-trouble-cannabis";
export const POLICY_ID = "good-trouble-retail-v1";
export const RETURN_URL_BASE = "https://www.goodtroublecanna.com/age-verification-result";
export const NONCE_COLLECTION = "AbraxasVerificationNonces";
export const NONCE_TTL_MS = 10 * 60 * 1000;
export const CLAIM_TTL_MS = 2 * 60 * 1000;
export const MAX_VALIDATION_ATTEMPTS = 3;
export const GTV_PARAM = "gtv";
export const RECEIPT_VALIDATION_MODE = "sandbox";

/** Nonce lifecycle states — backend collection only. */
export const NONCE_STATE = {
  PENDING: "pending",
  VALIDATING: "validating",
  CONSUMED: "consumed",
};
