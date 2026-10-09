// FILE: examples/good-trouble-wix/pages/goodTroublePurchaseAgeGateSkip.integration.test.js

import { createHash } from "node:crypto";
import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryNonceStore } from "../backend/memoryNonceStore.js";
import {
  __testOnlySetHashFn,
  completePurchaseVerificationService,
  createPurchaseVerificationStartService,
} from "../backend/abraxasVerificationService.js";
import {
  persistPurchaseVerifiedState,
  shouldSkipAgeGate,
} from "./ageGateAccessState.js";
import { shouldContinueAfterPurchaseVerification } from "./purchaseCallbackLogic.js";
import { withTestEscrowPepperDeps } from "../backend/testPkceEscrowFixtures.js";

const hashFn = (value) => createHash("sha256").update(value, "utf8").digest("hex");

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
  };
}

describe("Good Trouble purchase → age gate skip", () => {
  beforeEach(() => {
    __testOnlySetHashFn(hashFn);
  });

  it("suppresses redundant sandbox age popup after verified purchase callback state", async () => {
    const store = createMemoryNonceStore();
    const start = await createPurchaseVerificationStartService(
      null,
      withTestEscrowPepperDeps({ store, skipCaptcha: true }),
      "/",
    );
    const expiresAtIso = "2099-01-01T00:00:00.000Z";

    const complete = await completePurchaseVerificationService(
      "dr_pilot_valid_12345678",
      start.flowId,
      start.verifier,
      {
        store,
        validateReceipt: async () => ({
          verified: true,
          expires_at: expiresAtIso,
        }),
      },
    );

    expect(shouldContinueAfterPurchaseVerification(complete)).toBe(true);
    expect(complete.expires_at).toBe(expiresAtIso);

    const localStorage = createMemoryStorage();
    const sessionStorage = createMemoryStorage();
    const verifiedAt = Date.parse("2026-06-01T00:00:00.000Z");
    persistPurchaseVerifiedState(localStorage, {
      expiresAt: Date.parse(expiresAtIso),
      verifiedAt,
    });

    expect(shouldSkipAgeGate({
      localStorage,
      sessionStorage,
      now: verifiedAt + 1000,
    })).toEqual({ skip: true, reason: "abraxas_purchase_verified" });
  });

  it("does not skip age gate for a fresh browser session without persisted state", () => {
    const localStorage = createMemoryStorage();
    const sessionStorage = createMemoryStorage();
    expect(shouldSkipAgeGate({ localStorage, sessionStorage }).skip).toBe(false);
  });
});
