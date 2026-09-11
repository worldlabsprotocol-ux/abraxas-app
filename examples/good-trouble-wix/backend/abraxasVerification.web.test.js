import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryNonceStore } from "./memoryNonceStore.js";
import { FLOW_ID_RE, VERIFIER_RE, ABRAXAS_ORIGIN } from "./constants.js";
import * as service from "./abraxasVerificationService.js";
import { createWixNonceStore } from "./wixNonceStore.js";
import { createPurchaseVerificationStart } from "./abraxasVerification.web.js";

vi.mock("wix-web-module", () => ({
  Permissions: { Anyone: "Anyone" },
  webMethod: (_permissions, handler) => handler,
}));

vi.mock("./wixNonceStore.js", () => ({ createWixNonceStore: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

describe("purchase web method pilot CAPTCHA bypass", () => {
  it("explicitly bypasses CAPTCHA and returns a real successful purchase start", async () => {
    const store = createMemoryNonceStore();
    vi.mocked(createWixNonceStore).mockReturnValue(store);
    const start = vi.spyOn(service, "createPurchaseVerificationStartService");
    const log = vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await createPurchaseVerificationStart();

    expect(start).toHaveBeenCalledExactlyOnceWith(null, { skipCaptcha: true });
    expect(result.error).toBeUndefined();
    expect(new URL(result.verifyUrl).origin).toBe(ABRAXAS_ORIGIN);
    expect(result.flowId).toMatch(FLOW_ID_RE);
    expect(result.flowId).toMatch(/^gtf_/);
    expect(result.verifier).toMatch(VERIFIER_RE);
    expect(await store.findByFlowId(result.flowId)).toMatchObject({ purpose: "purchase" });
    const diagnostics = JSON.stringify(log.mock.calls);
    expect(diagnostics).not.toContain(result.verifier);
    expect(diagnostics).not.toContain(result.verifyUrl);
    expect(diagnostics).not.toContain(result.flowId);
  });

  it("preserves privacy-safe diagnostics when nonce insertion fails", async () => {
    const store = createMemoryNonceStore();
    vi.spyOn(store, "insert").mockRejectedValue(new Error("private provider detail"));
    vi.mocked(createWixNonceStore).mockReturnValue(store);
    const log = vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await createPurchaseVerificationStart();

    expect(result).toMatchObject({
      error: "nonce_insert_failed",
      diagnostic: { code: "nonce_insert_failed", purpose: "purchase" },
    });
    expect(log).toHaveBeenCalled();
    const output = JSON.stringify({ result, logs: log.mock.calls });
    expect(output).not.toContain("private provider detail");
    expect(output).not.toContain("verifier");
    expect(output).not.toContain("verifyUrl");
  });
});
