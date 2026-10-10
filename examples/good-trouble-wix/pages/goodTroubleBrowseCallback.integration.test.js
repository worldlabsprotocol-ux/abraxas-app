// FILE: examples/good-trouble-wix/pages/goodTroubleBrowseCallback.integration.test.js
// Browse callback page — server validation gate, /goods redirect, fail-closed restart.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createMemoryNonceStore } from "../backend/memoryNonceStore.js";
import {
  __testOnlySetHashFn,
  completeBrowseVerificationService,
  createBrowseVerificationStartService,
} from "../backend/abraxasVerificationService.js";
import {
  BROWSE_POST_VERIFICATION_FALLBACK,
  BROWSE_SUCCESS_MESSAGE,
  resolveBrowsePostVerificationRedirectDestination,
  shouldContinueAfterBrowseVerification,
} from "../public/browseCallbackLogic.js";

const ROOT = join(process.cwd(), "examples/good-trouble-wix");
const CALLBACK_SOURCE = readFileSync(join(ROOT, "pages/BrowseVerificationResult.js"), "utf8");

const hashFn = (value) => createHash("sha256").update(value, "utf8").digest("hex");

describe("Good Trouble browse callback integration", () => {
  beforeEach(() => {
    __testOnlySetHashFn(hashFn);
  });

  it("callback page requires completeBrowseVerification before browse access flag", () => {
    expect(CALLBACK_SOURCE).toContain("completeBrowseVerification");
    expect(CALLBACK_SOURCE).toContain("shouldContinueAfterBrowseVerification");
    expect(CALLBACK_SOURCE).toContain("BROWSE_SUCCESS_MESSAGE");
    expect(BROWSE_SUCCESS_MESSAGE).toBe("Verification confirmed");
    expect(CALLBACK_SOURCE).toContain("#restartAbraxasButton");
    expect(CALLBACK_SOURCE).not.toMatch(/status\s*===\s*["']approved["']/);
  });

  it("defaults post-verification destination to /goods", () => {
    expect(resolveBrowsePostVerificationRedirectDestination({})).toBe(BROWSE_POST_VERIFICATION_FALLBACK);
    expect(BROWSE_POST_VERIFICATION_FALLBACK).toBe("/goods");
  });

  it("rejects purchase-shaped completion at browse core", async () => {
    const store = createMemoryNonceStore();
    const start = await createBrowseVerificationStartService(null, { store, skipCaptcha: true });
    const purchaseFlowId = start.flowId.replace(/^gtb_/, "gtf_");
    const result = await completeBrowseVerificationService(
      "jwt-browse",
      purchaseFlowId,
      start.verifier,
      {
        store,
        validateBrowseReceipt: async () => ({ verified: true, transientFailure: false }),
      },
    );
    expect(result.verified).not.toBe(true);
  });

  it("accepts browse verification only when purpose is browse", async () => {
    const store = createMemoryNonceStore();
    const start = await createBrowseVerificationStartService(null, { store, skipCaptcha: true });
    const result = await completeBrowseVerificationService(
      "jwt-browse",
      start.flowId,
      start.verifier,
      {
        store,
        validateBrowseReceipt: async () => ({ verified: true, transientFailure: false }),
      },
    );
    expect(shouldContinueAfterBrowseVerification(result)).toBe(true);
    expect(result.purpose).toBe("browse");
  });
});
