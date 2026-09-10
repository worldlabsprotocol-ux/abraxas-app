// FILE: examples/good-trouble-wix/pages/purchaseVerificationLogic.test.js

import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  createPurchaseVerificationController,
  formatPurchasePreviewDiagnostic,
  interpretPurchaseStartResult,
  PURCHASE_STATUS_GENERIC_FAILURE,
  PURCHASE_STATUS_RATE_LIMITED,
} from "./purchaseVerificationLogic.js";

const ENTRY_SOURCE = readFileSync(
  new URL("./PurchaseVerificationEntry.js", import.meta.url),
  "utf8",
);

describe("purchaseVerificationLogic", () => {
  it("shows generic production failure without diagnostic suffix", () => {
    const interpreted = interpretPurchaseStartResult({
      result: {
        error: "nonce_insert_failed",
        diagnostic: {
          code: "nonce_insert_failed",
          stage: "nonce_insert",
          correlationId: "corr_1",
        },
      },
      viewMode: "Site",
    });

    expect(interpreted.ok).toBe(false);
    expect(interpreted.message).toBe(PURCHASE_STATUS_GENERIC_FAILURE);
    expect(interpreted.previewDetail).toBeUndefined();
  });

  it("surfaces allowlisted preview diagnostic suffix", () => {
    const interpreted = interpretPurchaseStartResult({
      result: {
        error: "rate_limited",
        diagnostic: {
          code: "rate_limited",
          stage: "capacity_precheck",
          correlationId: "corr_2",
        },
      },
      viewMode: "Preview",
    });

    expect(interpreted.ok).toBe(false);
    expect(interpreted.message).toBe(PURCHASE_STATUS_RATE_LIMITED);
    expect(interpreted.previewDetail).toBe("rate_limited @capacity_precheck ref=corr_2");
  });

  it("accepts successful purchase start payloads", () => {
    const interpreted = interpretPurchaseStartResult({
      result: {
        verifyUrl: "https://abraxasworld.xyz/partner/verify?x=1",
        flowId: `gtf_${"a".repeat(64)}`,
        verifier: "b".repeat(64),
        purpose: "purchase",
        policyId: "good-trouble-retail-v1",
      },
      viewMode: "Site",
    });

    expect(interpreted.ok).toBe(true);
    expect(interpreted.result.flowId).toMatch(/^gtf_/);
    expect(interpreted.result.verifyUrl).toContain("/partner/verify");
    expect(interpreted.result.verifier).toHaveLength(64);
  });

  it("controller redirects on Site and stores verifier", async () => {
    const deps = {
      setStatus: vi.fn(),
      startPurchaseVerification: vi.fn(async () => ({
        verifyUrl: "https://abraxasworld.xyz/partner/verify?x=1",
        flowId: `gtf_${"a".repeat(64)}`,
        verifier: "b".repeat(64),
      })),
      getViewMode: vi.fn(async () => "Site"),
      storeVerifier: vi.fn(),
      saveReturnDestination: vi.fn(),
      navigateToVerifyUrl: vi.fn(),
    };

    const controller = createPurchaseVerificationController(deps);
    const result = await controller.start();

    expect(result).toEqual({ ok: true, code: "redirecting", result: expect.any(Object) });
    expect(deps.storeVerifier).toHaveBeenCalledOnce();
    expect(deps.navigateToVerifyUrl).toHaveBeenCalledOnce();
  });

  it("controller reports preview pass without navigation", async () => {
    const deps = {
      setStatus: vi.fn(),
      startPurchaseVerification: vi.fn(async () => ({
        verifyUrl: "https://abraxasworld.xyz/partner/verify?x=1",
        flowId: `gtf_${"a".repeat(64)}`,
        verifier: "b".repeat(64),
      })),
      getViewMode: vi.fn(async () => "Preview"),
      storeVerifier: vi.fn(),
      saveReturnDestination: vi.fn(),
      navigateToVerifyUrl: vi.fn(),
    };

    const controller = createPurchaseVerificationController(deps);
    const result = await controller.start();

    expect(result.code).toBe("preview_backend_passed");
    expect(deps.navigateToVerifyUrl).not.toHaveBeenCalled();
    expect(deps.storeVerifier).not.toHaveBeenCalled();
  });

  it("formats preview diagnostics without secrets", () => {
    expect(
      formatPurchasePreviewDiagnostic({
        code: "capacity_count_invalid",
        stage: "capacity_precheck",
        correlationId: "abc",
      }),
    ).toBe("capacity_count_invalid @capacity_precheck ref=abc");
  });
});

describe("PurchaseVerificationEntry deployment contract", () => {
  it("imports purchase logic from public module path", () => {
    expect(ENTRY_SOURCE).toContain('from "public/purchaseVerificationLogic"');
    expect(ENTRY_SOURCE).not.toContain('from "./purchaseVerificationLogic"');
  });

  it("does not swallow backend errors without surfacing preview diagnostics", () => {
    expect(ENTRY_SOURCE).toContain("createPurchaseVerificationController");
    expect(ENTRY_SOURCE).not.toMatch(/catch\s*\{\s*if \(status\) status\.text = "Verification could not be started/);
  });
});
