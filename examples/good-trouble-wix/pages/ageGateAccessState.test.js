// FILE: examples/good-trouble-wix/pages/ageGateAccessState.test.js

import { describe, expect, it } from "vitest";
import {
  BROWSE_VERIFIED_LOCAL_STORAGE_KEY,
  hasValidTraditionalAttestation,
  persistBrowseVerifiedState,
  readBrowseVerifiedState,
  shouldSkipAgeGate,
} from "./ageGateAccessState.js";
import {
  TRADITIONAL_AGE_GATE_STORAGE_KEY,
  buildTraditionalAgeAttestationValue,
} from "./ageVerificationPopupLogic.js";
import { BROWSE_ACCESS_STORAGE_KEY } from "../public/abraxasClientConstants.js";

function createMemoryStorage() {
  /** @type {Record<string, string>} */
  const data = {};
  return {
    setItem(key, value) {
      data[key] = value;
    },
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    removeItem(key) {
      delete data[key];
    },
    clear() {
      for (const key of Object.keys(data)) delete data[key];
    },
  };
}

describe("ageGateAccessState", () => {
  it("persists and reads server-authoritative browse expiry", () => {
    const storage = createMemoryStorage();
    const now = Date.parse("2026-01-01T00:00:00.000Z");
    const expiresAt = now + 24 * 60 * 60 * 1000;
    persistBrowseVerifiedState(storage, { expiresAt, verifiedAt: now });
    expect(readBrowseVerifiedState(storage, now)).toEqual({
      valid: true,
      expiresAt,
      verifiedAt: now,
    });
    expect(readBrowseVerifiedState(storage, expiresAt + 1)).toEqual({ valid: false });
    expect(storage.getItem(BROWSE_VERIFIED_LOCAL_STORAGE_KEY)).toBeNull();
  });

  it("skips the age gate for validated Abraxas browse state", () => {
    const localStorage = createMemoryStorage();
    const sessionStorage = createMemoryStorage();
    const now = Date.now();
    persistBrowseVerifiedState(localStorage, {
      expiresAt: now + 60_000,
      verifiedAt: now,
    });
    expect(shouldSkipAgeGate({ localStorage, sessionStorage, now }).skip).toBe(true);
  });

  it("skips for traditional self-attestation within TTL", () => {
    const localStorage = createMemoryStorage();
    const sessionStorage = createMemoryStorage();
    const now = Date.parse("2026-06-01T00:00:00.000Z");
    localStorage.setItem(
      TRADITIONAL_AGE_GATE_STORAGE_KEY,
      buildTraditionalAgeAttestationValue(now),
    );
    expect(hasValidTraditionalAttestation(localStorage, now)).toBe(true);
    expect(shouldSkipAgeGate({ localStorage, sessionStorage, now }).reason).toBe(
      "traditional_self_attested",
    );
  });

  it("does not skip when no authoritative state exists", () => {
    const localStorage = createMemoryStorage();
    const sessionStorage = createMemoryStorage();
    sessionStorage.setItem(BROWSE_ACCESS_STORAGE_KEY, String(Date.now() - 48 * 60 * 60 * 1000));
    expect(shouldSkipAgeGate({ localStorage, sessionStorage }).skip).toBe(false);
  });
});
