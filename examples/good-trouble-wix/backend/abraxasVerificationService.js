// FILE: examples/good-trouble-wix/backend/abraxasVerificationService.js
// Testable Abraxas verification service — CAPTCHA + capacity + PKCE lifecycle.

import { fetchAndValidateSandboxReceipt } from "./abraxasReceiptValidator.js";
import { authorizeCaptchaToken } from "./captchaGate.js";
import { MAX_OUTSTANDING_PENDING_FLOWS } from "./constants.js";
import {
  assertCapacityAvailable,
  finalizeFlowStart,
} from "./flowCapacity.js";
import {
  buildVerificationStartPayload,
  completeAbraxasVerificationCore,
} from "./nonceLifecycle.js";

/** @type {((value: string) => Promise<string> | string) | null} */
let configuredHashFn = null;

export function configureAbraxasHashFn(hashFn) {
  configuredHashFn = hashFn;
}

/** @internal */
export function __testOnlySetHashFn(hashFn) {
  configuredHashFn = hashFn;
}

async function sha256Hex(value) {
  if (configuredHashFn) return configuredHashFn(value);
  throw new Error("Configure wix-crypto sha256 via configureAbraxasHashFn before deployment");
}

async function resolveStore(deps) {
  if (deps.store) return deps.store;
  const { createWixNonceStore } = await import("./wixNonceStore.js");
  return createWixNonceStore();
}

/**
 * @param {unknown} captchaToken Wix reCAPTCHA token from frontend element
 * @param {{
 *   store?: import("./nonceLifecycle.js").FlowStore,
 *   hashFn?: (v: string) => Promise<string> | string,
 *   authorizeCaptcha?: (token: string) => Promise<unknown>,
 *   skipCaptcha?: boolean,
 * }} [deps]
 */
export async function createAbraxasVerificationStartService(captchaToken, deps = {}) {
  if (!deps.skipCaptcha) {
    const captcha = await authorizeCaptchaToken(
      captchaToken,
      deps.authorizeCaptcha,
    );
    if (!captcha.ok) {
      return { error: captcha.code };
    }
  }

  const store = await resolveStore(deps);
  const hashFn = deps.hashFn ?? sha256Hex;
  const now = deps.now ?? new Date();

  const capacity = await assertCapacityAvailable(
    store,
    MAX_OUTSTANDING_PENDING_FLOWS,
    now,
  );
  if (!capacity.ok) {
    return { error: capacity.code };
  }

  const payload = await buildVerificationStartPayload({ hashFn, now });
  const inserted = await store.insert(payload.flowRecord);

  const finalized = await finalizeFlowStart(
    store,
    inserted._id,
    MAX_OUTSTANDING_PENDING_FLOWS,
    now,
  );
  if (!finalized.ok) {
    return { error: finalized.code };
  }

  return {
    verifyUrl: payload.verifyUrl,
    flowId: payload.flowId,
    verifier: payload.verifier,
  };
}

/**
 * @param {{
 *   store?: import("./nonceLifecycle.js").FlowStore,
 *   hashFn?: (v: string) => Promise<string> | string,
 *   validateReceipt?: (id: string) => Promise<{ verified: boolean, transientFailure?: boolean }>,
 * }} [deps]
 */
export async function completeAbraxasVerificationService(receiptId, flowId, verifier, deps = {}) {
  const store = await resolveStore(deps);
  const hashFn = deps.hashFn ?? sha256Hex;

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
