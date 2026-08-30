// FILE: examples/good-trouble-wix/backend/pkceProof.js
// PKCE-style proof-of-possession — never trust frontend-supplied visitor identity.

import { timingSafeEqual as nodeTimingSafeEqual } from "node:crypto";
import {
  FLOW_ID_RE,
  MAX_INPUT_LENGTH,
  RECEIPT_ID_RE,
  VERIFIER_RE,
} from "./constants.js";

/**
 * Timing-safe string equality.
 * @param {string} a
 * @param {string} b
 */
export function timingSafeEqualStrings(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) return false;
    return nodeTimingSafeEqual(bufA, bufB);
  } catch {
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let i = 0; i < a.length; i += 1) {
      mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return mismatch === 0;
  }
}

/**
 * @param {unknown} flowId
 * @returns {{ ok: true, flowId: string } | { ok: false, code: string }}
 */
export function validateFlowId(flowId) {
  const trimmed = typeof flowId === "string" ? flowId.trim() : "";
  if (!trimmed || trimmed.length > MAX_INPUT_LENGTH.flowId) {
    return { ok: false, code: "invalid_flow_id" };
  }
  if (!FLOW_ID_RE.test(trimmed)) {
    return { ok: false, code: "invalid_flow_id" };
  }
  return { ok: true, flowId: trimmed };
}

/**
 * @param {unknown} verifier
 * @returns {{ ok: true, verifier: string } | { ok: false, code: string }}
 */
export function validateVerifier(verifier) {
  const trimmed = typeof verifier === "string" ? verifier.trim() : "";
  if (!trimmed || trimmed.length > MAX_INPUT_LENGTH.verifier) {
    return { ok: false, code: "missing_verifier" };
  }
  if (!VERIFIER_RE.test(trimmed)) {
    return { ok: false, code: "invalid_verifier" };
  }
  return { ok: true, verifier: trimmed };
}

/**
 * @param {unknown} receiptId
 * @returns {{ ok: true, receiptId: string } | { ok: false, code: string }}
 */
export function validateReceiptId(receiptId) {
  const trimmed = typeof receiptId === "string" ? receiptId.trim() : "";
  if (!trimmed || trimmed.length > MAX_INPUT_LENGTH.receiptId) {
    return { ok: false, code: "missing_receipt_id" };
  }
  if (!RECEIPT_ID_RE.test(trimmed)) {
    return { ok: false, code: "invalid_receipt_id" };
  }
  return { ok: true, receiptId: trimmed };
}

/**
 * Verify PKCE proof-of-possession: SHA-256(verifier) must match stored challenge.
 * @param {string} verifier
 * @param {string} storedChallenge
 * @param {(input: string) => Promise<string> | string} hashFn
 */
export async function verifyVerifierChallenge(verifier, storedChallenge, hashFn) {
  const derived = await hashFn(verifier);
  if (!timingSafeEqualStrings(derived, storedChallenge)) {
    return { ok: false, code: "verifier_mismatch" };
  }
  return { ok: true };
}
