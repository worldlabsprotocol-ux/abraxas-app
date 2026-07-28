// FILE: lib/sui/zklogin/fetchLoginEpoch.test.ts

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { fetchLoginMaxEpoch } from "./fetchLoginEpoch";

describe("fetchLoginMaxEpoch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns max epoch from prepare API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        max_epoch: 120,
        network: "devnet",
        rpc_host: "rpc-devnet.suiscan.xyz",
      }),
    }));

    const result = await fetchLoginMaxEpoch();
    expect(result).toEqual({
      ok: true,
      maxEpoch: 120,
      network: "devnet",
      rpcHost: "rpc-devnet.suiscan.xyz",
    });
  });

  it("reports prepare API host on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")));

    const result = await fetchLoginMaxEpoch();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("prepare_api");
      expect(result.error).toContain("/api/auth/zklogin/prepare");
    }
  });

  it("reports RPC host from server error payload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        ok: false,
        error: "connection refused",
        phase: "sui_epoch_fetch",
        network: "devnet",
        rpc_host: "bad-rpc.example.com",
      }),
    }));

    const result = await fetchLoginMaxEpoch();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("bad-rpc.example.com");
      expect(result.error).toContain("HTTP 503");
    }
  });
});
