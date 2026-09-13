// FILE: examples/good-trouble-wix/pages/goodTroubleBrowseJourney.integration.test.js
// Homepage browse popup → backend browse start → Abraxas verify URL contract.

import { createHash } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createMemoryNonceStore } from "../backend/memoryNonceStore.js";
import {
  __testOnlySetHashFn,
  createBrowseVerificationStartService,
} from "../backend/abraxasVerificationService.js";
import {
  BROWSE_POLICY_ID,
  clearStalePurchaseSessionArtifacts,
  createPopupController,
  PURCHASE_CALLBACK_PATH,
  PURCHASE_POLICY_ID,
  PURCHASE_FLOW_ID_PREFIX,
  validateBrowseVerificationStart,
} from "./ageVerificationPopupLogic.js";

const hashFn = (value) => createHash("sha256").update(value, "utf8").digest("hex");

function createMemoryStorage() {
  /** @type {Record<string, string>} */
  const data = {
    good_trouble_return_destination_purchase: "/checkout",
    good_trouble_purchase_verified_pilot: "1",
    good_trouble_return_destination: "/old-purchase",
  };
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

describe("Good Trouble browse journey integration", () => {
  beforeEach(() => {
    __testOnlySetHashFn(hashFn);
  });

  it("browse service always returns gtb_, browse policy, browse callback, and purpose=browse", async () => {
    const store = createMemoryNonceStore();
    const result = await createBrowseVerificationStartService(null, {
      store,
      skipCaptcha: true,
    });

    expect(result.error).toBeUndefined();
    expect(result.flowId).toMatch(/^gtb_[a-f0-9]{64}$/);
    expect(result.policyId).toBe(BROWSE_POLICY_ID);
    expect(result.purpose).toBe("browse");
    expect(result.verifyUrl).toContain("policy_id=good-trouble-browse-v1");
    expect(result.verifyUrl).toContain("purpose=browse");
    expect(result.verifyUrl).toContain("browse-verification-result");
    expect(result.verifyUrl).not.toContain(PURCHASE_POLICY_ID);
    expect(result.verifyUrl).not.toContain(PURCHASE_CALLBACK_PATH);
    expect(result.verifyUrl).not.toMatch(/gtf_/);
  });

  it("popup controller clears purchase session artifacts before browse start", async () => {
    const storage = createMemoryStorage();
    const store = createMemoryNonceStore();
    const controller = createPopupController({
      setAbraxasButtonEnabled: vi.fn(async () => {}),
      setAbraxasButtonLabel: vi.fn(),
      setStatus: vi.fn(),
      startAbraxasVerification: () => createBrowseVerificationStartService(null, {
        store,
        skipCaptcha: true,
      }),
      clearStalePurchaseArtifacts: () => {
        clearStalePurchaseSessionArtifacts((key) => storage.removeItem(key));
      },
      sessionStorageAvailable: () => true,
      storeVerifier: vi.fn(),
      navigateToVerifyUrl: vi.fn(),
      getViewMode: vi.fn(async () => "Site"),
      storage,
    });

    await controller.onReady();
    const result = await controller.onAbraxasClick();

    expect(result).toEqual({ ok: true, code: "redirecting" });
    expect(storage.getItem("good_trouble_return_destination_purchase")).toBeNull();
    expect(storage.getItem("good_trouble_purchase_verified_pilot")).toBeNull();
    expect(storage.getItem("good_trouble_return_destination")).toBeNull();
  });

  it("rejects purchase-shaped backend responses at the popup guard", () => {
    const purchaseLeak = {
      verifyUrl: `https://abraxasworld.xyz/partner/verify?partner_id=good-trouble-cannabis&policy_id=${PURCHASE_POLICY_ID}&return_url=https%3A%2F%2Fwww.goodtroublecanna.com%2F${PURCHASE_CALLBACK_PATH}%3Fgtv%3Dgtf_${"a".repeat(64)}`,
      flowId: `${PURCHASE_FLOW_ID_PREFIX}${"a".repeat(64)}`,
      verifier: "b".repeat(64),
      policyId: PURCHASE_POLICY_ID,
      purpose: "purchase",
    };

    expect(validateBrowseVerificationStart(purchaseLeak).ok).toBe(false);
  });

  it("accepts only browse-shaped backend responses at the popup guard", async () => {
    const store = createMemoryNonceStore();
    const backend = await createBrowseVerificationStartService(null, {
      store,
      skipCaptcha: true,
    });
    const validated = validateBrowseVerificationStart(backend);
    expect(validated.ok).toBe(true);
    expect(validated.result.verifyUrl).toContain("policy_id=good-trouble-browse-v1&");
    expect(validated.result.verifyUrl).toContain("purpose=browse");
  });
});
