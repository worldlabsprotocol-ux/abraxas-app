// FILE: examples/good-trouble-wix/pages/goodTroublePurchaseCallbackContinue.integration.test.js

import { createHash } from "node:crypto";
import { describe, expect, it, beforeEach } from "vitest";
import { createMemoryNonceStore } from "../backend/memoryNonceStore.js";
import {
  __testOnlySetHashFn,
  completePurchaseVerificationService,
  createPurchaseVerificationStartService,
} from "../backend/abraxasVerificationService.js";
import { PARTNER_ID, POLICY_ID } from "../backend/constants.js";
import {
  resolvePostVerificationRedirectDestination,
  shouldContinueAfterPurchaseVerification,
} from "./purchaseCallbackLogic.js";
import { hasUntrustedRedirectQueryParams } from "./purchaseReturnDestination.js";

const hashFn = (value) => createHash("sha256").update(value, "utf8").digest("hex");

const VALID_PRODUCTION_RECEIPT = {
  signature_valid: true,
  decision_result: "approved",
  status: "active",
  partner_id: PARTNER_ID,
  policy_id: POLICY_ID,
  purpose: "purchase",
  schema_version: "1.0.0",
  artifact_type: "eligibility_decision_receipt",
  expires_at: "2099-01-01T00:00:00.000Z",
  evaluated_claim_refs: [{ status: "active", claim_type: "self_attested_age_band" }],
  production_usable: true,
};

describe("Good Trouble purchase callback continuation", () => {
  beforeEach(() => {
    __testOnlySetHashFn(hashFn);
  });

  it("stores authoritative destination at start and returns it only after verification", async () => {
    const store = createMemoryNonceStore();
    const start = await createPurchaseVerificationStartService(null, { store, skipCaptcha: true }, "/cart");
    expect(start.error).toBeUndefined();

    const stored = await store.findByFlowId(start.flowId);
    expect(stored?.returnDestinationPath).toBe("/cart");

    const complete = await completePurchaseVerificationService(
      "dr_pilot_valid_12345678",
      start.flowId,
      start.verifier,
      {
        store,
        validateReceipt: async () => ({ verified: true }),
      },
    );

    expect(shouldContinueAfterPurchaseVerification(complete)).toBe(true);
    expect(complete.returnDestination).toBe("/cart");
    expect(resolvePostVerificationRedirectDestination({
      serverDestination: complete.returnDestination,
      sessionDestination: "/session-only",
    })).toBe("/cart");
  });

  it("does not redirect on invalid receipt", async () => {
    const store = createMemoryNonceStore();
    const start = await createPurchaseVerificationStartService(null, { store, skipCaptcha: true }, "/cart");

    const complete = await completePurchaseVerificationService(
      "dr_invalid_12345678",
      start.flowId,
      start.verifier,
      {
        store,
        validateReceipt: async () => ({ verified: false }),
      },
    );

    expect(shouldContinueAfterPurchaseVerification(complete)).toBe(false);
    expect(complete.code).toBe("receipt_invalid");
  });

  it("rejects replay after flow consumed", async () => {
    const store = createMemoryNonceStore();
    const start = await createPurchaseVerificationStartService(null, { store, skipCaptcha: true }, "/cart");

    await completePurchaseVerificationService(
      "dr_pilot_valid_12345678",
      start.flowId,
      start.verifier,
      { store, validateReceipt: async () => ({ verified: true }) },
    );

    const replay = await completePurchaseVerificationService(
      "dr_pilot_valid_12345678",
      start.flowId,
      start.verifier,
      { store, validateReceipt: async () => ({ verified: true }) },
    );

    expect(replay.verified).toBe(false);
    expect(replay.code).toBe("flow_already_consumed");
    expect(shouldContinueAfterPurchaseVerification(replay)).toBe(false);
  });

  it("rejects attacker-controlled callback redirect params", () => {
    expect(hasUntrustedRedirectQueryParams({
      gtv: "gtf_" + "a".repeat(64),
      receipt_id: "dr_x",
      destination: "/checkout",
    })).toBe(true);
  });

  it("does not accept external URLs as stored destinations", async () => {
    const store = createMemoryNonceStore();
    const start = await createPurchaseVerificationStartService(
      null,
      { store, skipCaptcha: true },
      "//evil.example/phish",
    );

    const stored = await store.findByFlowId(start.flowId);
    expect(stored?.returnDestinationPath).toBe("/goods");
  });

  it("does not redirect when verifier mismatches", async () => {
    const store = createMemoryNonceStore();
    const start = await createPurchaseVerificationStartService(null, { store, skipCaptcha: true }, "/cart");

    const complete = await completePurchaseVerificationService(
      "dr_pilot_valid_12345678",
      start.flowId,
      "c".repeat(64),
      { store, validateReceipt: async () => ({ verified: true }) },
    );

    expect(shouldContinueAfterPurchaseVerification(complete)).toBe(false);
    expect(complete.code).toBe("verifier_mismatch");
  });

  it("does not redirect on purpose mismatch (browse flow completed as purchase)", async () => {
    const store = createMemoryNonceStore();
    const { createBrowseVerificationStartService } = await import("../backend/abraxasVerificationService.js");
    const browse = await createBrowseVerificationStartService(null, { store, skipCaptcha: true });

    const complete = await completePurchaseVerificationService(
      "dr_pilot_valid_12345678",
      browse.flowId,
      browse.verifier,
      { store, validateReceipt: async () => ({ verified: true }) },
    );

    expect(shouldContinueAfterPurchaseVerification(complete)).toBe(false);
    expect(complete.code).toBe("flow_purpose_mismatch");
  });

  it("browse start remains unaffected", async () => {
    const store = createMemoryNonceStore();
    const { createBrowseVerificationStartService } = await import("../backend/abraxasVerificationService.js");
    const browse = await createBrowseVerificationStartService(null, { store, skipCaptcha: true });
    const stored = await store.findByFlowId(browse.flowId);
    expect(stored?.returnDestinationPath).toBeUndefined();
  });
});
