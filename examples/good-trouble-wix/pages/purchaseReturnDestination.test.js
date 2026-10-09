// FILE: examples/good-trouble-wix/pages/purchaseReturnDestination.test.js

import { describe, expect, it } from "vitest";
import {
  parsePurchaseEntryFromQuery,
  resolvePurchaseReturnDestinationForStart,
} from "./purchaseReturnDestination.js";

describe("purchaseReturnDestination", () => {
  it("captures ORDER NOW origin from entry query param", () => {
    expect(parsePurchaseEntryFromQuery({ from: "/product-page" })).toBe("/product-page");
    expect(parsePurchaseEntryFromQuery({ from: "//evil.example" })).toBeNull();
  });

  it("prefers query origin over session and current path", () => {
    expect(resolvePurchaseReturnDestinationForStart({
      queryFrom: "/checkout",
      sessionDestination: "/cart",
      currentUrl: "https://www.goodtroublecanna.com/purchase-verification",
    })).toBe("/checkout");
  });

  it("never uses callback page as destination (falls back to The Goods)", () => {
    expect(resolvePurchaseReturnDestinationForStart({
      currentUrl: "https://www.goodtroublecanna.com/age-verification-result",
    })).toBe("/goods");
  });
});
