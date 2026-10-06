import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  classifySuiRpcError,
  isSuiRpcHttpFailureMessage,
  probeConfiguredSuiJsonRpc,
  SUI_RPC_UNAVAILABLE_CODE,
} from "./rpcReadiness";

describe("isSuiRpcHttpFailureMessage", () => {
  it("detects Mysten unexpected status code messages", () => {
    expect(isSuiRpcHttpFailureMessage("Unexpected status code: 404")).toBe(true);
    expect(isSuiRpcHttpFailureMessage("Unexpected status code: 520")).toBe(true);
    expect(isSuiRpcHttpFailureMessage("network timeout")).toBe(false);
  });
});

describe("classifySuiRpcError", () => {
  beforeEach(() => {
    vi.stubEnv("SUI_RPC_URL", "https://rpc-devnet.suiscan.xyz");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("classifies HTTP status failures as sui_rpc_unavailable", () => {
    const result = classifySuiRpcError(new Error("Unexpected status code: 404"));
    expect(result).toEqual({
      code: SUI_RPC_UNAVAILABLE_CODE,
      message: "Sui RPC unavailable",
      http_status: 404,
      rpc_host: "rpc-devnet.suiscan.xyz",
    });
  });

  it("returns null for unrelated errors", () => {
    expect(classifySuiRpcError(new Error("provision logic failed"))).toBeNull();
    expect(classifySuiRpcError("string error")).toBeNull();
  });
});

describe("probeConfiguredSuiJsonRpc", () => {
  beforeEach(() => {
    vi.stubEnv("SUI_RPC_URL", "https://fullnode.devnet.sui.io:443");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports HTTP non-2xx as probe failure", async () => {
    const fetchMock = vi.fn(async () => new Response("not found", { status: 404 }));
    const result = await probeConfiguredSuiJsonRpc(fetchMock);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.http_status).toBe(404);
      expect(result.rpc_host).toBe("fullnode.devnet.sui.io");
    }
  });

  it("reports JSON-RPC error body as probe failure", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      error: { message: "method unavailable" },
    }), { status: 200 }));
    const result = await probeConfiguredSuiJsonRpc(fetchMock);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.detail).toContain("method unavailable");
    }
  });

  it("reports success when JSON-RPC returns result", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: { epoch: "1" },
    }), { status: 200 }));
    const result = await probeConfiguredSuiJsonRpc(fetchMock);
    expect(result).toEqual({ ok: true, rpc_host: "fullnode.devnet.sui.io" });
  });
});
