// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { useHostedHolderBootstrap } from "./useHostedHolderBootstrap";

const mockBootstrap = vi.fn();
vi.mock("@/lib/auth/bootstrapHostedHolderSession", () => ({
  bootstrapHostedHolderSession: (...args: unknown[]) => mockBootstrap(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("hosted holder bootstrap with cached UI identity", () => {
  it("checks the server even when local storage already supplies a Sui address", async () => {
    mockBootstrap.mockResolvedValue({ ok: true, suiAddress: `0x${"a".repeat(64)}` });
    const onBootstrapped = vi.fn();
    const { result } = renderHook(() => useHostedHolderBootstrap({
      enabled: true,
      suiAddress: `0x${"b".repeat(64)}`,
      authLoading: false,
      partnerId: "good-trouble",
      policyId: "good-trouble-age_21_retail-v1",
      purpose: "purchase",
      returnUrl: "https://www.goodtroublecanna.com/age-verification-result",
      verifyRequestId: "vr_a1b2c3d4e5f67890",
      onBootstrapped,
    }));
    await waitFor(() => expect(result.current.state).toBe("ready"));
    expect(mockBootstrap).toHaveBeenCalledOnce();
    expect(onBootstrapped).toHaveBeenCalledWith(`0x${"a".repeat(64)}`);
  });
});
