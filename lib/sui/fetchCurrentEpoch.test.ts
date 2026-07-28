// FILE: lib/sui/fetchCurrentEpoch.test.ts

import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("./serverClient", () => ({
  getSuiClient: vi.fn(),
}));

vi.mock("./network", () => ({
  getSuiNetwork: () => "devnet",
  getSuiGraphqlUrl: () => "https://graphql.devnet.sui.io/graphql",
}));

import { getSuiClient } from "./serverClient";
import { fetchCurrentSuiEpoch } from "./fetchCurrentEpoch";

describe("fetchCurrentSuiEpoch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns epoch from JSON-RPC when available", async () => {
    vi.mocked(getSuiClient).mockReturnValue({
      getLatestSuiSystemState: async () => ({ epoch: "42" }),
    } as never);

    const result = await fetchCurrentSuiEpoch();
    expect(result).toEqual({ epoch: 42, source: "json_rpc" });
  });

  it("falls back to GraphQL when JSON-RPC fails", async () => {
    vi.mocked(getSuiClient).mockReturnValue({
      getLatestSuiSystemState: async () => {
        throw new Error("Unexpected status code: 520");
      },
    } as never);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { epoch: { epochId: 11 } } }),
    }));

    const result = await fetchCurrentSuiEpoch();
    expect(result.epoch).toBe(11);
    expect(result.source).toBe("graphql");
    expect(result.detail).toContain("520");
  });
});
