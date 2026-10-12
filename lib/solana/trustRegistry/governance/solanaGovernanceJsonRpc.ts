// FILE: lib/solana/trustRegistry/governance/solanaGovernanceJsonRpc.ts
// HTTP JSON-RPC for governance observation — avoids @solana/web3.js Connection / rpc-websockets on Vercel.

export type SolanaRpcFailureCode =
  | "rpc_timeout"
  | "rpc_http_error"
  | "rpc_malformed_response"
  | "rpc_transport_error";

export type SolanaRpcResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: SolanaRpcFailureCode; detail: string };

export type SolanaAccountSnapshot = {
  owner: string;
  executable: boolean;
  lamports: number;
  data: Buffer;
};

const DEFAULT_TIMEOUT_MS = 12_000;

export async function solanaJsonRpcCall(
  rpcUrl: string,
  method: string,
  params: unknown[],
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<SolanaRpcResult<unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false, code: "rpc_http_error", detail: `HTTP ${res.status}` };
    }
    const json = (await res.json()) as { result?: unknown; error?: { message?: string } };
    if (json.error) {
      return {
        ok: false,
        code: "rpc_malformed_response",
        detail: json.error.message ?? "json_rpc_error",
      };
    }
    return { ok: true, value: json.result ?? null };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, code: "rpc_timeout", detail: `timeout_${timeoutMs}ms` };
    }
    return {
      ok: false,
      code: "rpc_transport_error",
      detail: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

function parseAccountValue(raw: unknown): SolanaAccountSnapshot | null {
  if (raw == null) return null;
  if (typeof raw !== "object") return null;
  const row = raw as {
    owner?: string;
    executable?: boolean;
    lamports?: number;
    data?: [string, string] | string;
  };
  if (typeof row.owner !== "string") return null;
  let dataBuf: Buffer;
  if (Array.isArray(row.data) && typeof row.data[0] === "string") {
    dataBuf = Buffer.from(row.data[0], row.data[1] === "base64" ? "base64" : "base64");
  } else if (typeof row.data === "string") {
    dataBuf = Buffer.from(row.data, "base64");
  } else {
    return null;
  }
  return {
    owner: row.owner,
    executable: row.executable === true,
    lamports: typeof row.lamports === "number" ? row.lamports : 0,
    data: dataBuf,
  };
}

export async function fetchSolanaAccountInfo(
  rpcUrl: string,
  pubkey: string,
  commitment: "finalized" | "confirmed" = "finalized",
): Promise<SolanaRpcResult<SolanaAccountSnapshot | null>> {
  const result = await solanaJsonRpcCall(rpcUrl, "getAccountInfo", [
    pubkey,
    { encoding: "base64", commitment },
  ]);
  if (!result.ok) return result;
  let accountRaw: unknown = result.value;
  if (accountRaw && typeof accountRaw === "object" && "value" in accountRaw) {
    accountRaw = (accountRaw as { value: unknown }).value;
  }
  if (accountRaw == null) return { ok: true, value: null };
  const parsed = parseAccountValue(accountRaw);
  if (!parsed) {
    return { ok: false, code: "rpc_malformed_response", detail: "account_info_shape" };
  }
  return { ok: true, value: parsed };
}

export async function fetchSolanaGenesisHash(rpcUrl: string): Promise<SolanaRpcResult<string>> {
  const result = await solanaJsonRpcCall(rpcUrl, "getGenesisHash", []);
  if (!result.ok) return result;
  if (typeof result.value !== "string") {
    return { ok: false, code: "rpc_malformed_response", detail: "genesis_hash_shape" };
  }
  return { ok: true, value: result.value };
}

export async function fetchSolanaSlot(
  rpcUrl: string,
  commitment: "finalized" | "confirmed" = "finalized",
): Promise<SolanaRpcResult<number>> {
  const result = await solanaJsonRpcCall(rpcUrl, "getSlot", [{ commitment }]);
  if (!result.ok) return result;
  if (typeof result.value !== "number") {
    return { ok: false, code: "rpc_malformed_response", detail: "slot_shape" };
  }
  return { ok: true, value: result.value };
}
