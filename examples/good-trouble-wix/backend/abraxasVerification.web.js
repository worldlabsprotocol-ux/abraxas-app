// FILE: examples/good-trouble-wix/backend/abraxasVerification.web.js
// Good Trouble Canna — Wix Velo backend reference for Abraxas Passport sandbox verification.
// Anonymous-compatible PKCE proof-of-possession — no API key required.

import { fetchAndValidateSandboxReceipt } from "./abraxasReceiptValidator.js";
import { MAX_OUTSTANDING_PENDING_FLOWS } from "./constants.js";
import {
  buildVerificationStartPayload,
  completeAbraxasVerificationCore,
} from "./nonceLifecycle.js";

/** @type {((value: string) => Promise<string> | string) | null} */
let configuredHashFn = null;

/**
 * Production: configure wix-crypto sha256 before exposing web methods.
 *   import { sha256 } from "wix-crypto";
 *   configureAbraxasHashFn((value) => sha256(value));
 */
export function configureAbraxasHashFn(hashFn) {
  configuredHashFn = hashFn;
}

/** @internal Test-only hash injection */
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
 * Web method permissions (Wix Editor → Web Methods):
 * - createAbraxasVerificationStart: Anyone (anonymous visitors allowed)
 * - completeAbraxasVerification: Anyone (anonymous visitors allowed)
 *
 * No web method exposes collection CRUD. Backend-only wix-data access.
 *
 * @param {{ store?: import("./nonceLifecycle.js").FlowStore, hashFn?: (v: string) => Promise<string> | string }} [deps]
 */
export async function createAbraxasVerificationStart(deps = {}) {
  const store = await resolveStore(deps);
  const hashFn = deps.hashFn ?? sha256Hex;

  if (typeof store.countPending === "function") {
    const pending = await store.countPending();
    if (pending >= MAX_OUTSTANDING_PENDING_FLOWS) {
      return { error: "rate_limited" };
    }
  }

  const payload = await buildVerificationStartPayload({ hashFn });
  await store.insert(payload.flowRecord);

  return {
    verifyUrl: payload.verifyUrl,
    flowId: payload.flowId,
    verifier: payload.verifier,
  };
}

/**
 * Complete callback — requires PKCE verifier from sessionStorage (same browser).
 *
 * @param {string} receiptId Abraxas frozen callback param
 * @param {string} flowId opaque gtv flow identifier from callback URL
 * @param {string} verifier from sessionStorage (never from URL)
 * @param {{ store?: import("./nonceLifecycle.js").FlowStore, hashFn?: (v: string) => Promise<string> | string }} [deps]
 */
export async function completeAbraxasVerification(receiptId, flowId, verifier, deps = {}) {
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
