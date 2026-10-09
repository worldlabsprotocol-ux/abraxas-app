// FILE: examples/good-trouble-wix/public/siteAgeGatePolicy.test.js

import { describe, expect, it } from "vitest";

import {
  isAgeGateCallbackOrEntryPath,
  normalizeSitePath,
  shouldSuppressAutomaticAgeLightbox,
} from "./siteAgeGatePolicy.js";

import { persistPurchaseVerifiedState } from "./ageGateAccessState.js";

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}

describe("siteAgeGatePolicy", () => {
  it("normalizes full URLs to paths", () => {
    expect(normalizeSitePath("https://www.goodtroublecanna.com/goods")).toBe("/goods");
    expect(normalizeSitePath("/age-verification-result?gtv=x")).toBe("/age-verification-result");
  });

  it("suppresses automatic lightbox on Abraxas callback and purchase entry paths", () => {
    expect(isAgeGateCallbackOrEntryPath("/age-verification-result")).toBe(true);
    expect(isAgeGateCallbackOrEntryPath("/purchase-verification")).toBe(true);
    expect(isAgeGateCallbackOrEntryPath("/goods")).toBe(false);
  });

  it("suppresses when purchase verified localStorage is valid", () => {
    const localStorage = memoryStorage();
    const sessionStorage = memoryStorage();
    const now = Date.now();
    persistPurchaseVerifiedState(localStorage, {
      verifiedAt: now,
      expiresAt: now + 60_000,
    });
    const decision = shouldSuppressAutomaticAgeLightbox({
      localStorage,
      sessionStorage,
      pagePath: "/",
    });
    expect(decision.suppress).toBe(true);
    expect(decision.reason).toBe("abraxas_purchase_verified");
  });
});
