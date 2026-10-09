// FILE: examples/good-trouble-wix/pages/ageGateAccessState.js
// Wix deployment: copy to src/public/ageGateAccessState.js
// Privacy-safe age-gate skip state — derived from server-validated browse receipts only.

import {
  BROWSE_ACCESS_STORAGE_KEY,
  PURCHASE_VERIFIED_LOCAL_STORAGE_KEY,
} from "../public/abraxasClientConstants.js";
import {
  TRADITIONAL_AGE_GATE_STORAGE_KEY,
  TRADITIONAL_AGE_GATE_TTL_MS,
} from "./ageVerificationPopupLogic.js";

/** Server-authoritative browse expiry persisted after validated callback. */
export const BROWSE_VERIFIED_LOCAL_STORAGE_KEY = "good_trouble_abraxas_browse_verified";

export { PURCHASE_VERIFIED_LOCAL_STORAGE_KEY };

/**
 * @param {Storage} storage
 * @param {number} [now]
 * @returns {{ valid: true, expiresAt: number, verifiedAt: number } | { valid: false }}
 */
export function readBrowseVerifiedState(storage, now = Date.now()) {
  try {
    const raw = storage.getItem(BROWSE_VERIFIED_LOCAL_STORAGE_KEY);
    if (!raw) return { valid: false };
    const parsed = JSON.parse(raw);
    const expiresAt = Number(parsed?.expiresAt);
    const verifiedAt = Number(parsed?.verifiedAt);
    if (!Number.isFinite(expiresAt) || !Number.isFinite(verifiedAt)) {
      return { valid: false };
    }
    if (expiresAt <= now) {
      storage.removeItem(BROWSE_VERIFIED_LOCAL_STORAGE_KEY);
      return { valid: false };
    }
    return { valid: true, expiresAt, verifiedAt };
  } catch {
    return { valid: false };
  }
}

/**
 * @param {Storage} storage
 * @param {{ expiresAt: number, verifiedAt?: number }} input
 */
/**
 * @param {Storage} storage
 * @param {number} [now]
 * @returns {{ valid: true, expiresAt: number, verifiedAt: number } | { valid: false }}
 */
export function readPurchaseVerifiedState(storage, now = Date.now()) {
  try {
    const raw = storage.getItem(PURCHASE_VERIFIED_LOCAL_STORAGE_KEY);
    if (!raw) return { valid: false };
    const parsed = JSON.parse(raw);
    const expiresAt = Number(parsed?.expiresAt);
    const verifiedAt = Number(parsed?.verifiedAt);
    if (!Number.isFinite(expiresAt) || !Number.isFinite(verifiedAt)) {
      return { valid: false };
    }
    if (expiresAt <= now) {
      storage.removeItem(PURCHASE_VERIFIED_LOCAL_STORAGE_KEY);
      return { valid: false };
    }
    return { valid: true, expiresAt, verifiedAt };
  } catch {
    return { valid: false };
  }
}

/**
 * @param {Storage} storage
 * @param {{ expiresAt: number, verifiedAt?: number }} input
 */
export function persistPurchaseVerifiedState(storage, input) {
  const expiresAt = Number(input.expiresAt);
  const verifiedAt = Number.isFinite(input.verifiedAt) ? input.verifiedAt : Date.now();
  if (!Number.isFinite(expiresAt) || expiresAt <= verifiedAt) return;
  storage.setItem(
    PURCHASE_VERIFIED_LOCAL_STORAGE_KEY,
    JSON.stringify({
      expiresAt,
      verifiedAt,
    }),
  );
}

export function persistBrowseVerifiedState(storage, input) {
  const expiresAt = Number(input.expiresAt);
  const verifiedAt = Number.isFinite(input.verifiedAt) ? input.verifiedAt : Date.now();
  if (!Number.isFinite(expiresAt) || expiresAt <= verifiedAt) return;
  storage.setItem(
    BROWSE_VERIFIED_LOCAL_STORAGE_KEY,
    JSON.stringify({
      expiresAt,
      verifiedAt,
    }),
  );
}

/**
 * Session convenience flag — same TTL as local authoritative state when available.
 * @param {Storage} storage
 * @param {number} [now]
 */
export function hasActiveBrowseSessionFlag(storage, now = Date.now()) {
  try {
    const raw = storage.getItem(BROWSE_ACCESS_STORAGE_KEY);
    if (!raw) return false;
    const verifiedAt = Number(raw);
    if (!Number.isFinite(verifiedAt)) return true;
    return now - verifiedAt < 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * @param {Storage} storage
 * @param {number} [now]
 */
export function hasValidTraditionalAttestation(storage, now = Date.now()) {
  try {
    const raw = storage.getItem(TRADITIONAL_AGE_GATE_STORAGE_KEY);
    if (!raw) return false;
    const expiresAt = Number(raw);
    if (!Number.isFinite(expiresAt)) return false;
    if (expiresAt <= now) {
      storage.removeItem(TRADITIONAL_AGE_GATE_STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * UI-only skip for the age popup. Never checkout authority.
 * @param {{
 *   localStorage: Storage,
 *   sessionStorage: Storage,
 *   now?: number,
 * }} input
 */
export function shouldSkipAgeGate(input) {
  const now = input.now ?? Date.now();
  if (readPurchaseVerifiedState(input.localStorage, now).valid) {
    return { skip: true, reason: "abraxas_purchase_verified" };
  }
  if (readBrowseVerifiedState(input.localStorage, now).valid) {
    return { skip: true, reason: "abraxas_browse_verified" };
  }
  if (hasActiveBrowseSessionFlag(input.sessionStorage, now)) {
    return { skip: true, reason: "abraxas_browse_session" };
  }
  if (hasValidTraditionalAttestation(input.localStorage, now)) {
    return { skip: true, reason: "traditional_self_attested" };
  }
  return { skip: false, reason: null };
}

export const TRADITIONAL_AGE_GATE_TTL_EXPORT = TRADITIONAL_AGE_GATE_TTL_MS;
