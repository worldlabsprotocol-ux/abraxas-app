// FILE: examples/good-trouble-wix/backend/browseMobileSessionContinuity.test.js
// Browse PKCE escrow parity — Seeker-like sessionStorage loss and ownership recovery.

import { createHash } from "node:crypto";
import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryNonceStore } from "./memoryNonceStore.js";
import {
  completeBrowseVerificationCore,
  buildVerificationStartPayload,
} from "./nonceLifecycle.js";
import {
  completeBrowseVerificationService,
  createBrowseVerificationStartService,
  __testOnlySetHashFn,
} from "./abraxasVerificationService.js";
import { TEST_ESCROW_PEPPER_HEX, withTestEscrowPepperDeps } from "./testPkceEscrowFixtures.js";

const hashFn = (value) => createHash("sha256").update(value, "utf8").digest("hex");

const VALID_BROWSE = {
  verified: true,
  transientFailure: false,
  expires_at: "2099-01-01T00:00:00.000Z",
};

beforeEach(() => {
  __testOnlySetHashFn(hashFn);
});

async function startBrowse(store) {
  return createBrowseVerificationStartService(null, withTestEscrowPepperDeps({
    store,
    skipCaptcha: true,
  }));
}

describe("browse mobile PKCE session continuity", () => {
  const cases = [
    {
      name: "same-tab sessionStorage verifier",
      run: async () => {
        const store = createMemoryNonceStore();
        const start = await startBrowse(store);
        return completeBrowseVerificationService(
          "jwt-browse",
          start.flowId,
          start.verifier,
          "",
          withTestEscrowPepperDeps({
            store,
            validateBrowseReceipt: async () => VALID_BROWSE,
          }),
        );
      },
      expectVerified: true,
    },
    {
      name: "new-tab return via flow ownership secret (no sessionStorage verifier)",
      run: async () => {
        const store = createMemoryNonceStore();
        const start = await startBrowse(store);
        return completeBrowseVerificationService(
          "jwt-browse",
          start.flowId,
          "",
          start.flowOwnershipSecret,
          withTestEscrowPepperDeps({
            store,
            validateBrowseReceipt: async () => VALID_BROWSE,
          }),
        );
      },
      expectVerified: true,
    },
    {
      name: "missing sessionStorage and missing ownership",
      run: async () => {
        const store = createMemoryNonceStore();
        const start = await startBrowse(store);
        return completeBrowseVerificationService(
          "jwt-browse",
          start.flowId,
          "",
          "",
          withTestEscrowPepperDeps({
            store,
            validateBrowseReceipt: async () => VALID_BROWSE,
          }),
        );
      },
      expectVerified: false,
      expectCode: "missing_verifier",
    },
    {
      name: "wrong ownership secret",
      run: async () => {
        const store = createMemoryNonceStore();
        const start = await startBrowse(store);
        return completeBrowseVerificationService(
          "jwt-browse",
          start.flowId,
          "",
          "e".repeat(64),
          withTestEscrowPepperDeps({
            store,
            validateBrowseReceipt: async () => VALID_BROWSE,
          }),
        );
      },
      expectVerified: false,
      expectCode: "invalid_flow_ownership",
    },
    {
      name: "gtb and browse_receipt without PKCE proof",
      run: async () => {
        const store = createMemoryNonceStore();
        const start = await startBrowse(store);
        return completeBrowseVerificationCore({
          store,
          browseReceipt: "jwt-browse",
          flowId: start.flowId,
          verifier: "",
          flowOwnershipSecret: "",
          escrowPepper: TEST_ESCROW_PEPPER_HEX,
          hashFn,
          validateBrowseReceipt: async () => VALID_BROWSE,
        });
      },
      expectVerified: false,
      expectCode: "missing_verifier",
    },
    {
      name: "replay after consumption",
      run: async () => {
        const store = createMemoryNonceStore();
        const start = await startBrowse(store);
        const deps = withTestEscrowPepperDeps({
          store,
          validateBrowseReceipt: async () => VALID_BROWSE,
        });
        const first = await completeBrowseVerificationService(
          "jwt-browse",
          start.flowId,
          start.verifier,
          "",
          deps,
        );
        const second = await completeBrowseVerificationService(
          "jwt-browse",
          start.flowId,
          start.verifier,
          "",
          deps,
        );
        return { first, second };
      },
      expectVerified: false,
      expectCode: "flow_already_consumed",
    },
    {
      name: "invalid browse receipt fails closed after PKCE claim",
      run: async () => {
        const store = createMemoryNonceStore();
        const start = await startBrowse(store);
        return completeBrowseVerificationService(
          "jwt-browse-bad",
          start.flowId,
          start.verifier,
          "",
          withTestEscrowPepperDeps({
            store,
            validateBrowseReceipt: async () => ({ verified: false, transientFailure: false }),
          }),
        );
      },
      expectVerified: false,
      expectCode: "browse_receipt_invalid",
    },
    {
      name: "purchase gtf flow rejected at browse completion",
      run: async () => {
        const store = createMemoryNonceStore();
        const purchasePayload = await buildVerificationStartPayload({
          hashFn,
          purpose: "purchase",
          escrowPepper: TEST_ESCROW_PEPPER_HEX,
        });
        await store.insert(purchasePayload.flowRecord);
        return completeBrowseVerificationService(
          "jwt-browse",
          purchasePayload.flowId,
          purchasePayload.verifier,
          "",
          withTestEscrowPepperDeps({
            store,
            validateBrowseReceipt: async () => VALID_BROWSE,
          }),
        );
      },
      expectVerified: false,
      expectCode: "flow_purpose_mismatch",
    },
  ];

  for (const testCase of cases) {
    it(testCase.name, async () => {
      const outcome = await testCase.run();
      if (testCase.name === "replay after consumption") {
        expect(outcome.first.verified).toBe(true);
        expect(outcome.second.verified).toBe(false);
        expect(outcome.second.code).toBe("flow_already_consumed");
        return;
      }
      if (testCase.expectVerified) {
        expect(outcome.verified).toBe(true);
        expect(outcome.purpose).toBe("browse");
      } else {
        expect(outcome.verified).toBe(false);
        expect(outcome.code).toBe(testCase.expectCode);
      }
    });
  }
});
