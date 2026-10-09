// FILE: examples/good-trouble-wix/backend/mobileSessionContinuity.test.js
// Adversarial matrix — expected secure completion vs fail-closed restart.

import { createHash } from "node:crypto";
import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryNonceStore } from "./memoryNonceStore.js";
import {
  buildVerificationStartPayload,
  completeAbraxasVerificationCore,
} from "./nonceLifecycle.js";
import {
  completePurchaseVerificationService,
  createPurchaseVerificationStartService,
  __testOnlySetHashFn,
} from "./abraxasVerificationService.js";
import { configureFlowEscrowPepper } from "./flowOwnership.js";

const hashFn = (value) => createHash("sha256").update(value, "utf8").digest("hex");

const VALID_RECEIPT = {
  verified: true,
  transientFailure: false,
  expires_at: "2099-01-01T00:00:00.000Z",
};

const RECEIPT_OK = "dr_mobile_ok_0001";
const RECEIPT_BAD = "dr_mobile_bad_0001";

beforeEach(() => {
  __testOnlySetHashFn(hashFn);
  configureFlowEscrowPepper("mobile-continuity-test-pepper");
});

async function startPurchase(store) {
  return createPurchaseVerificationStartService(null, { store, skipCaptcha: true }, "/goods");
}

describe("mobile PKCE session continuity adversarial matrix", () => {
  const cases = [
    {
      name: "same-tab sessionStorage verifier",
      run: async () => {
        const store = createMemoryNonceStore();
        const start = await startPurchase(store);
        return completePurchaseVerificationService(
          RECEIPT_OK,
          start.flowId,
          start.verifier,
          "",
          { store, validateReceipt: async () => VALID_RECEIPT },
        );
      },
      expectVerified: true,
    },
    {
      name: "new-tab return via flow ownership secret (no sessionStorage verifier)",
      run: async () => {
        const store = createMemoryNonceStore();
        const start = await startPurchase(store);
        return completePurchaseVerificationService(
          RECEIPT_OK,
          start.flowId,
          "",
          start.flowOwnershipSecret,
          { store, validateReceipt: async () => VALID_RECEIPT },
        );
      },
      expectVerified: true,
    },
    {
      name: "missing sessionStorage and missing ownership",
      run: async () => {
        const store = createMemoryNonceStore();
        const start = await startPurchase(store);
        return completePurchaseVerificationService(
          RECEIPT_OK,
          start.flowId,
          "",
          "",
          { store, validateReceipt: async () => VALID_RECEIPT },
        );
      },
      expectVerified: false,
      expectCode: "missing_verifier",
    },
    {
      name: "wrong ownership secret",
      run: async () => {
        const store = createMemoryNonceStore();
        const start = await startPurchase(store);
        return completePurchaseVerificationService(
          RECEIPT_OK,
          start.flowId,
          "",
          "e".repeat(64),
          { store, validateReceipt: async () => VALID_RECEIPT },
        );
      },
      expectVerified: false,
      expectCode: "invalid_flow_ownership",
    },
    {
      name: "wrong verifier",
      run: async () => {
        const store = createMemoryNonceStore();
        const start = await startPurchase(store);
        return completePurchaseVerificationService(
          RECEIPT_OK,
          start.flowId,
          "b".repeat(64),
          "",
          { store, validateReceipt: async () => VALID_RECEIPT },
        );
      },
      expectVerified: false,
      expectCode: "verifier_mismatch",
    },
    {
      name: "reused gtv after consumption",
      run: async () => {
        const store = createMemoryNonceStore();
        const start = await startPurchase(store);
        const first = await completePurchaseVerificationService(
          RECEIPT_OK,
          start.flowId,
          start.verifier,
          "",
          { store, validateReceipt: async () => VALID_RECEIPT },
        );
        const second = await completePurchaseVerificationService(
          RECEIPT_OK,
          start.flowId,
          start.verifier,
          "",
          { store, validateReceipt: async () => VALID_RECEIPT },
        );
        return { first, second };
      },
      expectVerified: false,
      expectCode: "flow_already_consumed",
    },
    {
      name: "gtv and receipt without PKCE proof",
      run: async () => {
        const store = createMemoryNonceStore();
        const start = await startPurchase(store);
        return completeAbraxasVerificationCore({
          store,
          receiptId: RECEIPT_OK,
          flowId: start.flowId,
          verifier: "",
          flowOwnershipSecret: "",
          hashFn,
          validateReceipt: async () => VALID_RECEIPT,
        });
      },
      expectVerified: false,
      expectCode: "missing_verifier",
    },
    {
      name: "invalid receipt fails closed after PKCE claim",
      run: async () => {
        const store = createMemoryNonceStore();
        const start = await startPurchase(store);
        return completePurchaseVerificationService(
          RECEIPT_BAD,
          start.flowId,
          start.verifier,
          "",
          { store, validateReceipt: async () => ({ verified: false, transientFailure: false }) },
        );
      },
      expectVerified: false,
      expectCode: "receipt_invalid",
    },
  ];

  for (const testCase of cases) {
    it(testCase.name, async () => {
      const outcome = await testCase.run();
      if (testCase.name === "reused gtv after consumption") {
        expect(outcome.first.verified).toBe(true);
        expect(outcome.second.verified).toBe(false);
        expect(outcome.second.code).toBe("flow_already_consumed");
        return;
      }
      if (testCase.expectVerified) {
        expect(outcome.verified).toBe(true);
      } else {
        expect(outcome.verified).toBe(false);
        expect(outcome.code).toBe(testCase.expectCode);
      }
    });
  }
});
