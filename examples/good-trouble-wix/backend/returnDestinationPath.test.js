// FILE: examples/good-trouble-wix/backend/returnDestinationPath.test.js

import { describe, expect, it } from "vitest";
import {
  isSafeReturnDestinationPath,
  normalizeReturnDestinationPath,
  resolveAuthoritativeReturnDestination,
  resolvePurchaseStartDestination,
} from "./returnDestinationPath.js";
import { PURCHASE_POST_VERIFICATION_FALLBACK } from "./constants.js";

describe("returnDestinationPath", () => {
  it("accepts same-origin relative paths", () => {
    expect(isSafeReturnDestinationPath("/cart")).toBe(true);
    expect(isSafeReturnDestinationPath("/product-page")).toBe(true);
  });

  it("rejects open redirects and callback pages", () => {
    expect(isSafeReturnDestinationPath("//evil.example")).toBe(false);
    expect(isSafeReturnDestinationPath("https://evil.example")).toBe(false);
    expect(isSafeReturnDestinationPath("/age-verification-result")).toBe(false);
    expect(isSafeReturnDestinationPath("/browse-verification-result")).toBe(false);
    expect(isSafeReturnDestinationPath("/cart?next=//evil.example")).toBe(false);
  });

  it("resolves authoritative destination with server precedence", () => {
    expect(resolveAuthoritativeReturnDestination({
      serverDestination: "/checkout",
      sessionDestination: "/cart",
    })).toBe("/checkout");
  });

  it("falls back when no trusted destination exists", () => {
    expect(resolveAuthoritativeReturnDestination({
      serverDestination: null,
      sessionDestination: null,
    })).toBe(PURCHASE_POST_VERIFICATION_FALLBACK);
  });

  it("stores requested path at purchase start", () => {
    expect(resolvePurchaseStartDestination({
      requestedPath: "/order-now-target",
      currentPath: "/purchase-verification",
    })).toBe("/order-now-target");
  });
});
