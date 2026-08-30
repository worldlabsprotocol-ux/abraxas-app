// FILE: examples/good-trouble-wix/backend/nonceLifecycle.js
// Backend-only flow lifecycle with PKCE proof-of-possession and pending → validating → consumed states.

import {
  ABRAXAS_ORIGIN,
  CLAIM_TTL_MS,
  FLOW_ID_PREFIX,
  FLOW_TTL_MS,
  GTV_PARAM,
  MAX_VALIDATION_ATTEMPTS,
  NONCE_STATE,
  PARTNER_ID,
  POLICY_ID,
  RECEIPT_VALIDATION_MODE,
  RETURN_URL_BASE,
  VERIFIER_BYTES,
} from "./constants.js";
import {
  validateFlowId,
  validateReceiptId,
  validateVerifier,
  verifyVerifierChallenge,
} from "./pkceProof.js";

function randomHex(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * @typedef {object} FlowRecord
 * @property {string} _id
 * @property {string} flowId
 * @property {string} verifierChallenge
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
 * @typedef {object} FlowStore
 * @property {(record: Omit<FlowRecord, "_id">) => Promise<FlowRecord>} insert
 * @property {(flowId: string) => Promise<FlowRecord | null>} findByFlowId
 * @property {(recordId: string, patch: Partial<FlowRecord>, guards?: { expectedState?: string, flowId?: string }) => Promise<FlowRecord | null>} updateGuarded
 * @property {() => Promise<number>} [countPending]
 */

/**
 * @param {string} value
 * @param {(input: string) => Promise<string> | string} hashFn
 */
export async function hashValue(value, hashFn) {
  return typeof hashFn === "function" ? hashFn(value) : value;
}

/**
 * Build Partner Flow entry URL. Callback carries opaque flowId in gtv — never the verifier.
 * @param {{ hashFn: (v: string) => Promise<string> | string, now?: Date }} params
 */
export async function buildVerificationStartPayload(params) {
  const now = params.now ?? new Date();
  const verifier = randomHex(VERIFIER_BYTES);
  const flowId = `${FLOW_ID_PREFIX}${randomHex(VERIFIER_BYTES)}`;
  const verifierChallenge = await hashValue(verifier, params.hashFn);
  const expiresAt = new Date(now.getTime() + FLOW_TTL_MS);
  const correlationId = randomHex(8);

  const returnUrl = `${RETURN_URL_BASE}?${GTV_PARAM}=${encodeURIComponent(flowId)}`;
  const search = new URLSearchParams({
    partner_id: PARTNER_ID,
    policy_id: POLICY_ID,
    return_url: returnUrl,
  });

  return {
    verifyUrl: `${ABRAXAS_ORIGIN}/partner/verify?${search.toString()}`,
    flowId,
    /** Returned over TLS web method only — frontend stores in sessionStorage, never in URL. */
    verifier,
    flowRecord: {
      flowId,
      verifierChallenge,
      state: NONCE_STATE.PENDING,
      createdAt: now,
      expiresAt,
      claimExpiresAt: null,
      claimToken: null,
      validationAttempts: 0,
      consumedAt: null,
      correlationId,
    },
  };
}

/**
 * Atomically claim a pending flow after PKCE verifier proof.
 * @returns {Promise<{ ok: true, record: FlowRecord } | { ok: false, code: string }>}
 */
export async function claimPendingFlow(store, params) {
  const now = params.now ?? new Date();
  const flowCheck = validateFlowId(params.flowId);
  if (!flowCheck.ok) return { ok: false, code: flowCheck.code };

  const verifierCheck = validateVerifier(params.verifier);
  if (!verifierCheck.ok) return { ok: false, code: verifierCheck.code };

  const record = await store.findByFlowId(flowCheck.flowId);
  if (!record) return { ok: false, code: "flow_not_found" };
  if (record.state === NONCE_STATE.CONSUMED) return { ok: false, code: "flow_already_consumed" };
  if (record.expiresAt.getTime() <= now.getTime()) return { ok: false, code: "flow_expired" };

  const proof = await verifyVerifierChallenge(
    verifierCheck.verifier,
    record.verifierChallenge,
    params.hashFn,
  );
  if (!proof.ok) return { ok: false, code: proof.code };

  if (record.state === NONCE_STATE.VALIDATING) {
    if (record.claimExpiresAt && record.claimExpiresAt.getTime() > now.getTime()) {
      return { ok: false, code: "flow_claim_in_progress" };
    }
    const released = await store.updateGuarded(record._id, {
      state: NONCE_STATE.PENDING,
      claimToken: null,
      claimExpiresAt: null,
    }, { expectedState: NONCE_STATE.VALIDATING, flowId: flowCheck.flowId });
    if (!released) return { ok: false, code: "flow_claim_in_progress" };
  }

  if (record.state !== NONCE_STATE.PENDING && record.state !== NONCE_STATE.VALIDATING) {
    return { ok: false, code: "flow_invalid_state" };
  }

  const claimToken = randomHex(16);
  const claimExpiresAt = new Date(now.getTime() + CLAIM_TTL_MS);
  const claimed = await store.updateGuarded(record._id, {
    state: NONCE_STATE.VALIDATING,
    claimToken,
    claimExpiresAt,
    validationAttempts: (record.validationAttempts ?? 0) + 1,
  }, { expectedState: NONCE_STATE.PENDING, flowId: flowCheck.flowId });

  if (!claimed || claimed.claimToken !== claimToken) {
    return { ok: false, code: "concurrent_completion_rejected" };
  }

  return { ok: true, record: claimed };
}

/**
 * @returns {Promise<{ ok: true, record: FlowRecord } | { ok: false, code: string }>}
 */
export async function markFlowConsumed(store, record, now = new Date()) {
  const consumed = await store.updateGuarded(record._id, {
    state: NONCE_STATE.CONSUMED,
    consumedAt: now,
    claimToken: null,
    claimExpiresAt: null,
  }, { expectedState: NONCE_STATE.VALIDATING, flowId: record.flowId });

  if (!consumed) return { ok: false, code: "consume_failed" };
  return { ok: true, record: consumed };
}

/**
 * Release validating claim after transient receipt-fetch failure (bounded retries, never grants verification).
 */
export async function releaseValidatingClaim(store, record) {
  if ((record.validationAttempts ?? 0) >= MAX_VALIDATION_ATTEMPTS) {
    return markFlowConsumed(store, record);
  }

  const released = await store.updateGuarded(record._id, {
    state: NONCE_STATE.PENDING,
    claimToken: null,
    claimExpiresAt: null,
  }, { expectedState: NONCE_STATE.VALIDATING, flowId: record.flowId });

  return released
    ? { ok: true, record: released, released: true }
    : { ok: false, code: "release_failed" };
}

/**
 * Complete Abraxas callback — PKCE proof required; fail-closed; no localStorage authority.
 * @param {object} params
 * @param {FlowStore} params.store
 * @param {string} params.receiptId
 * @param {string} params.flowId opaque gtv flow identifier from callback URL
 * @param {string} params.verifier from sessionStorage (same browser context)
 * @param {(input: string) => Promise<string> | string} params.hashFn
 * @param {(receiptId: string) => Promise<{ verified: boolean, transientFailure?: boolean }>} params.validateReceipt
 * @param {Date} [params.now]
 */
export async function completeAbraxasVerificationCore(params) {
  const receiptCheck = validateReceiptId(params.receiptId);
  if (!receiptCheck.ok) {
    return { verified: false, code: receiptCheck.code };
  }

  const flowCheck = validateFlowId(params.flowId);
  if (!flowCheck.ok) {
    return { verified: false, code: flowCheck.code };
  }

  const verifierCheck = validateVerifier(params.verifier);
  if (!verifierCheck.ok) {
    return { verified: false, code: verifierCheck.code };
  }

  const claim = await claimPendingFlow(params.store, {
    flowId: flowCheck.flowId,
    verifier: verifierCheck.verifier,
    hashFn: params.hashFn,
    now: params.now,
  });
  if (!claim.ok) {
    return { verified: false, code: claim.code };
  }

  const validation = await params.validateReceipt(receiptCheck.receiptId);
  if (validation.transientFailure) {
    const release = await releaseValidatingClaim(params.store, claim.record);
    return {
      verified: false,
      code: release.released ? "receipt_fetch_transient_failure" : "flow_exhausted",
      retryable: Boolean(release.released),
    };
  }

  if (!validation.verified) {
    await markFlowConsumed(params.store, claim.record, params.now);
    return { verified: false, code: "receipt_invalid" };
  }

  const consumed = await markFlowConsumed(params.store, claim.record, params.now);
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
