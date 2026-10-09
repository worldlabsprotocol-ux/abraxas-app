// FILE: examples/good-trouble-wix/pages/goodTroubleReturnToGoods.integration.test.js

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryNonceStore } from "../backend/memoryNonceStore.js";
import {
  __testOnlySetHashFn,
  completePurchaseVerificationService,
  createPurchaseVerificationStartService,
} from "../backend/abraxasVerificationService.js";
import { PURCHASE_POST_VERIFICATION_FALLBACK } from "../public/abraxasClientConstants.js";
import {
  resolvePostVerificationRedirectDestination,
  shouldContinueAfterPurchaseVerification,
} from "../public/purchaseCallbackLogic.js";
import { resolvePurchaseReturnDestinationForStart } from "../public/purchaseReturnDestination.js";

const hashFn = (value) => createHash("sha256").update(value, "utf8").digest("hex");

describe("Good Trouble hosted return → The Goods", () => {
  beforeEach(() => {
    __testOnlySetHashFn(hashFn);
  });

  it("defaults purchase start destination to /goods when on verification entry", () => {
    expect(resolvePurchaseReturnDestinationForStart({
      currentUrl: "https://www.goodtroublecanna.com/purchase-verification",
    })).toBe("/goods");
    expect(PURCHASE_POST_VERIFICATION_FALLBACK).toBe("/goods");
  });

  it("redirects to server-stored destination or /goods after verified callback", async () => {
    const store = createMemoryNonceStore();
    const start = await createPurchaseVerificationStartService(
      null,
      { store, skipCaptcha: true },
      null,
    );

    const complete = await completePurchaseVerificationService(
      "dr_pilot_valid_12345678",
      start.flowId,
      start.verifier,
      {
        store,
        validateReceipt: async () => ({ verified: true, expires_at: "2099-01-01T00:00:00.000Z" }),
      },
    );

    expect(shouldContinueAfterPurchaseVerification(complete)).toBe(true);
    expect(resolvePostVerificationRedirectDestination({
      serverDestination: complete.returnDestination,
      sessionDestination: null,
    })).toBe("/goods");
  });

  it("Purchase Verification Entry redirects verified users away from entry page", () => {
    const entry = readFileSync(
      join(process.cwd(), "examples/good-trouble-wix/pages/PurchaseVerificationEntry.js"),
      "utf8",
    );
    expect(entry).toContain("shouldSkipAgeGate");
    expect(entry).toContain("GOOD_TROUBLE_THE_GOODS_SHOP_PATH");
    expect(entry).toMatch(/if \(skip\.skip\)[\s\S]*wixLocationFrontend\.to\(GOOD_TROUBLE_THE_GOODS_SHOP_PATH\)/);
  });
});
