// FILE: examples/good-trouble-wix/backend/abraxasVerificationService.js
// Testable Abraxas verification service — separate browse (L0) and purchase (L2+) lifecycles.

import { fetchAndValidateSandboxReceipt } from "./abraxasReceiptValidator.js";
import { verifyBrowseReceiptRemotely } from "./browseReceiptRemoteValidator.js";
import { authorizeCaptchaToken } from "./captchaGate.js";
import { MAX_OUTSTANDING_PENDING_FLOWS } from "./constants.js";
import {
  assertCapacityAvailable,
  finalizeFlowStart,
} from "./flowCapacity.js";
import {
  buildVerificationStartPayload,
  completeAbraxasVerificationCore,
  completeBrowseVerificationCore,
} from "./nonceLifecycle.js";
import { sha256Hex as defaultSha256Hex } from "./sha256Adapter.js";

/** @type {((value: string) => Promise<string> | string) | null} */
let configuredHashFn = null;

export function configureAbraxasHashFn(hashFn) {
  configuredHashFn = hashFn;
}

export function __testOnlySetHashFn(hashFn) {
  configuredHashFn = hashFn;
}

function resolveHashFn(depsHashFn) {
  if (depsHashFn) return depsHashFn;
  if (configuredHashFn) return configuredHashFn;
  return defaultSha256Hex;
}

async function resolveStore(deps) {
  if (deps.store) return deps.store;
  const { createWixNonceStore } = await import("./wixNonceStore.js");
  return createWixNonceStore();
}

async function startFlow(purpose, captchaToken, deps = {}) {
  if (!deps.skipCaptcha) {
    const captcha = await authorizeCaptchaToken(captchaToken, deps.authorizeCaptcha);
    if (!captcha.ok) return { error: captcha.code };
  }

  const store = await resolveStore(deps);
  const hashFn = resolveHashFn(deps.hashFn);
  const now = deps.now ?? new Date();

  const capacity = await assertCapacityAvailable(store, MAX_OUTSTANDING_PENDING_FLOWS, now);
  if (!capacity.ok) return { error: capacity.code };

  const payload = await buildVerificationStartPayload({ hashFn, now, purpose });
  const inserted = await store.insert(payload.flowRecord);
  const finalized = await finalizeFlowStart(store, inserted._id, MAX_OUTSTANDING_PENDING_FLOWS, now);
  if (!finalized.ok) return { error: finalized.code };

  return {
    verifyUrl: payload.verifyUrl,
    flowId: payload.flowId,
    verifier: payload.verifier,
    purpose: payload.purpose,
    policyId: payload.policyId,
  };
}

export async function createBrowseVerificationStartService(captchaToken, deps = {}) {
  return startFlow("browse", captchaToken, deps);
}

export async function createPurchaseVerificationStartService(captchaToken, deps = {}) {
  return startFlow("purchase", captchaToken, deps);
}

/** @deprecated Use createPurchaseVerificationStartService */
export async function createAbraxasVerificationStartService(captchaToken, deps = {}) {
  return createPurchaseVerificationStartService(captchaToken, {
    ...deps,
    skipCaptcha: deps.skipCaptcha ?? true,
  });
}

export async function completePurchaseVerificationService(receiptId, flowId, verifier, deps = {}) {
  const store = await resolveStore(deps);
  const hashFn = resolveHashFn(deps.hashFn);

  const defaultValidateReceipt = async (id) => {
    try {
      const result = await fetchAndValidateSandboxReceipt(id);
      return { verified: result.verified, transientFailure: false };
    } catch {
      return { verified: false, transientFailure: true };
    }
  };

  return completeAbraxasVerificationCore({
    store,
    receiptId,
    flowId,
    verifier,
    hashFn,
    validateReceipt: deps.validateReceipt ?? defaultValidateReceipt,
  });
}

export async function completeBrowseVerificationService(browseReceipt, flowId, verifier, deps = {}) {
  const store = await resolveStore(deps);
  const hashFn = resolveHashFn(deps.hashFn);

  const defaultValidateBrowse = async (token, record) => {
    const result = await verifyBrowseReceiptRemotely(token, { fetchImpl: deps.fetchImpl });
    if (result.transientFailure) {
      return { verified: false, transientFailure: true };
    }
    if (!result.verified) {
      return { verified: false, transientFailure: false };
    }
    if (record?.policyId && result.payload?.policy_id !== record.policyId) {
      return { verified: false, transientFailure: false };
    }
    return { verified: true, transientFailure: false };
  };

  return completeBrowseVerificationCore({
    store,
    browseReceipt,
    flowId,
    verifier,
    hashFn,
    validateBrowseReceipt: deps.validateBrowseReceipt ?? defaultValidateBrowse,
  });
}

/** @deprecated Use completePurchaseVerificationService */
export async function completeAbraxasVerificationService(receiptId, flowId, verifier, deps = {}) {
  return completePurchaseVerificationService(receiptId, flowId, verifier, deps);
}
