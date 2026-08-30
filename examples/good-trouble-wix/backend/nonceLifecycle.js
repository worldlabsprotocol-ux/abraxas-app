// FILE: examples/good-trouble-wix/backend/nonceLifecycle.js
// Backend-only nonce lifecycle with pending → validating → consumed state machine.

import {
  ABRAXAS_ORIGIN,
  CLAIM_TTL_MS,
  GTV_PARAM,
  MAX_VALIDATION_ATTEMPTS,
  NONCE_STATE,
  NONCE_TTL_MS,
  PARTNER_ID,
  POLICY_ID,
  RECEIPT_VALIDATION_MODE,
  RETURN_URL_BASE,
} from "./constants.js";
import { resolveTrustedSessionBinding } from "./sessionBinding.js";

function randomHex(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * @typedef {object} NonceRecord
 * @property {string} _id
 * @property {string} nonceHash
 * @property {string} sessionBinding
 * @property {string} state
 * @property {Date} createdAt
 * @property {Date} expiresAt
 * @property {Date | null} [claimExpiresAt]
 * @property {string | null} [claimToken]
 * @property {number} [validationAttempts]
 * @property {Date | null} [consumedAt]
 * @property {string | null} [correlationId]
 */

/**
 * @typedef {object} NonceStore
 * @property {(record: Omit<NonceRecord, "_id">) => Promise<NonceRecord>} insert
 * @property {(nonceHash: string) => Promise<NonceRecord | null>} findByHash
 * @property {(recordId: string, patch: Partial<NonceRecord>, guards?: { expectedState?: string, sessionBinding?: string }) => Promise<NonceRecord | null>} updateGuarded
 */

/**
 * @param {string} value
 * @param {(input: string) => Promise<string> | string} hashFn
 */
export async function hashNonce(value, hashFn) {
  return typeof hashFn === "function" ? hashFn(value) : value;
}

/**
 * Build Partner Flow entry URL. Raw nonce appears only in encoded return_url query.
 * @param {{ sessionBinding: string, hashFn: (v: string) => Promise<string> | string, now?: Date }} params
 */
export async function buildVerificationStartPayload(params) {
  const now = params.now ?? new Date();
  const rawNonce = randomHex(32);
  const nonceHash = await hashNonce(rawNonce, params.hashFn);
  const expiresAt = new Date(now.getTime() + NONCE_TTL_MS);
  const correlationId = randomHex(8);

  const returnUrl = `${RETURN_URL_BASE}?${GTV_PARAM}=${encodeURIComponent(rawNonce)}`;
  const search = new URLSearchParams({
    partner_id: PARTNER_ID,
    policy_id: POLICY_ID,
    return_url: returnUrl,
  });

  return {
    verifyUrl: `${ABRAXAS_ORIGIN}/partner/verify?${search.toString()}`,
    nonceRecord: {
      nonceHash,
      sessionBinding: params.sessionBinding,
      state: NONCE_STATE.PENDING,
      createdAt: now,
      expiresAt,
      claimExpiresAt: null,
      claimToken: null,
      validationAttempts: 0,
      consumedAt: null,
      correlationId,
    },
    /** Present only for tests — never persist or log in production. */
    _testOnlyRawNonce: rawNonce,
  };
}

/**
 * Atomically claim a pending nonce for validation.
 * @returns {Promise<{ ok: true, record: NonceRecord } | { ok: false, code: string }>}
 */
export async function claimPendingNonce(store, params) {
  const now = params.now ?? new Date();
  const nonceHash = await hashNonce(params.rawNonce, params.hashFn);
  const record = await store.findByHash(nonceHash);

  if (!record) return { ok: false, code: "nonce_not_found" };
  if (record.sessionBinding !== params.sessionBinding) return { ok: false, code: "session_mismatch" };
  if (record.state === NONCE_STATE.CONSUMED) return { ok: false, code: "nonce_already_consumed" };
  if (record.expiresAt.getTime() <= now.getTime()) return { ok: false, code: "nonce_expired" };

  if (record.state === NONCE_STATE.VALIDATING) {
    if (record.claimExpiresAt && record.claimExpiresAt.getTime() > now.getTime()) {
      return { ok: false, code: "nonce_claim_in_progress" };
    }
    const released = await store.updateGuarded(record._id, {
      state: NONCE_STATE.PENDING,
      claimToken: null,
      claimExpiresAt: null,
    }, { expectedState: NONCE_STATE.VALIDATING, sessionBinding: params.sessionBinding });
    if (!released) return { ok: false, code: "nonce_claim_in_progress" };
  }

  if (record.state !== NONCE_STATE.PENDING && record.state !== NONCE_STATE.VALIDATING) {
    return { ok: false, code: "nonce_invalid_state" };
  }

  const claimToken = randomHex(16);
  const claimExpiresAt = new Date(now.getTime() + CLAIM_TTL_MS);
  const claimed = await store.updateGuarded(record._id, {
    state: NONCE_STATE.VALIDATING,
    claimToken,
    claimExpiresAt,
    validationAttempts: (record.validationAttempts ?? 0) + 1,
  }, { expectedState: NONCE_STATE.PENDING, sessionBinding: params.sessionBinding });

  if (!claimed || claimed.claimToken !== claimToken) {
    return { ok: false, code: "concurrent_callback_rejected" };
  }

  return { ok: true, record: claimed };
}

/**
 * @returns {Promise<{ ok: true, record: NonceRecord } | { ok: false, code: string }>}
 */
export async function markNonceConsumed(store, record, now = new Date()) {
  const consumed = await store.updateGuarded(record._id, {
    state: NONCE_STATE.CONSUMED,
    consumedAt: now,
    claimToken: null,
    claimExpiresAt: null,
  }, { expectedState: NONCE_STATE.VALIDATING, sessionBinding: record.sessionBinding });

  if (!consumed) return { ok: false, code: "consume_failed" };
  return { ok: true, record: consumed };
}

/**
 * Release a validating claim after transient receipt-fetch failure (bounded retries).
 */
export async function releaseValidatingClaim(store, record) {
  if ((record.validationAttempts ?? 0) >= MAX_VALIDATION_ATTEMPTS) {
    return markNonceConsumed(store, record);
  }

  const released = await store.updateGuarded(record._id, {
    state: NONCE_STATE.PENDING,
    claimToken: null,
    claimExpiresAt: null,
  }, { expectedState: NONCE_STATE.VALIDATING, sessionBinding: record.sessionBinding });

  return released
    ? { ok: true, record: released, released: true }
    : { ok: false, code: "release_failed" };
}

/**
 * Complete Abraxas callback — fail-closed, no localStorage authority.
 * @param {object} params
 * @param {NonceStore} params.store
 * @param {{ memberId?: string | null }} params.trustedBackendContext
 * @param {string} params.receiptId
 * @param {string} params.rawNonce
 * @param {(input: string) => Promise<string> | string} params.hashFn
 * @param {(receiptId: string) => Promise<{ verified: boolean, transientFailure?: boolean }>} params.validateReceipt
 * @param {Date} [params.now]
 */
export async function completeAbraxasVerificationCore(params) {
  const binding = resolveTrustedSessionBinding(params.trustedBackendContext);
  if (!binding.ok) {
    return { verified: false, code: binding.code };
  }

  const receiptId = typeof params.receiptId === "string" ? params.receiptId.trim() : "";
  const rawNonce = typeof params.rawNonce === "string" ? params.rawNonce.trim() : "";
  if (!receiptId || !rawNonce) {
    return { verified: false, code: "missing_callback_params" };
  }

  const claim = await claimPendingNonce(params.store, {
    sessionBinding: binding.sessionBinding,
    rawNonce,
    hashFn: params.hashFn,
    now: params.now,
  });
  if (!claim.ok) {
    return { verified: false, code: claim.code };
  }

  const validation = await params.validateReceipt(receiptId);
  if (validation.transientFailure) {
    const release = await releaseValidatingClaim(params.store, claim.record);
    return {
      verified: false,
      code: release.released ? "receipt_fetch_transient_failure" : "nonce_exhausted",
    };
  }

  if (!validation.verified) {
    await markNonceConsumed(params.store, claim.record, params.now);
    return { verified: false, code: "receipt_invalid" };
  }

  const consumed = await markNonceConsumed(params.store, claim.record, params.now);
  if (!consumed.ok) {
    return { verified: false, code: consumed.code };
  }

  return { verified: true, code: "verified" };
}

export const INTEGRATION_CONSTANTS = {
  mode: RECEIPT_VALIDATION_MODE,
  partnerId: PARTNER_ID,
  policyId: POLICY_ID,
  returnUrlBase: RETURN_URL_BASE,
  gtvParam: GTV_PARAM,
};
