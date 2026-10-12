import { describe, expect, it, vi, afterEach } from "vitest";
import {
  fetchSolanaAccountInfo,
  fetchSolanaGenesisHash,
  solanaJsonRpcCall,
} from "@/lib/solana/trustRegistry/governance/solanaGovernanceJsonRpc";

describe("solanaGovernanceJsonRpc", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns rpc_timeout when fetch aborts", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });

    const result = await solanaJsonRpcCall("https://rpc.test", "getGenesisHash", [], 5);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("rpc_timeout");
  });

  it("returns rpc_http_error on non-OK HTTP status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("bad", { status: 502 }));
    const result = await solanaJsonRpcCall("https://rpc.test", "getGenesisHash", []);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("rpc_http_error");
  });

  it("parses genesis hash from JSON-RPC envelope", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const result = await fetchSolanaGenesisHash("https://rpc.test");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toContain("EtWTR");
  });

  it("returns null account when RPC value is null", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { value: null } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const result = await fetchSolanaAccountInfo("https://rpc.test", "11111111111111111111111111111111");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeNull();
  });

  it("flags malformed account payloads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { value: { owner: 1 } } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const result = await fetchSolanaAccountInfo("https://rpc.test", "11111111111111111111111111111111");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("rpc_malformed_response");
  });
});
