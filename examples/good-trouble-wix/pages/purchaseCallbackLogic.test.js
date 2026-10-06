// FILE: examples/good-trouble-wix/pages/purchaseCallbackLogic.test.js

import { describe, expect, it } from "vitest";
import {
  CHECKING_VERIFICATION_MESSAGE,
  parseAllowlistedCallbackParams,
  resolvePostVerificationRedirectDestination,
  shouldContinueAfterPurchaseVerification,
} from "./purchaseCallbackLogic.js";
import { hasUntrustedRedirectQueryParams } from "./purchaseReturnDestination.js";

describe("purchaseCallbackLogic", () => {
  it("shows checking message constant aligned with Wix designer copy", () => {
    expect(CHECKING_VERIFICATION_MESSAGE).toBe("Checking verification...");
  });

  it("continues only after verified purchase result", () => {
    expect(shouldContinueAfterPurchaseVerification({ verified: true, purpose: "purchase" })).toBe(true);
    expect(shouldContinueAfterPurchaseVerification({ verified: false, purpose: "purchase" })).toBe(false);
    expect(shouldContinueAfterPurchaseVerification({ verified: true, purpose: "browse" })).toBe(false);
  });

  it("redirects using server destination after validation", () => {
    expect(resolvePostVerificationRedirectDestination({
      serverDestination: "/cart",
      sessionDestination: "/old",
    })).toBe("/cart");
  });

  it("ignores untrusted callback redirect query params", () => {
    expect(hasUntrustedRedirectQueryParams({ next: "/evil" })).toBe(true);
    expect(hasUntrustedRedirectQueryParams({ gtv: "gtf_abc", receipt_id: "dr_x" })).toBe(false);
  });

  it("allowlists only frozen callback params", () => {
    const allowed = new Set(["gtv", "receipt_id"]);
    const parsed = parseAllowlistedCallbackParams({
      gtv: "gtf_abc",
      receipt_id: "dr_x",
      next: "/evil",
    }, allowed);
    expect(parsed).toEqual({ gtv: "gtf_abc", receipt_id: "dr_x" });
    expect(parsed.next).toBeUndefined();
  });
});
