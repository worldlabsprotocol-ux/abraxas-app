// FILE: lib/sui/rpcReadiness.ts
// Probe configured Sui JSON-RPC for infrastructure readiness (no silent provider switching).

import { getRpcDiagnostics, rpcHostFromUrl } from "./rpcDiagnostics";
import { getSuiRpcUrl } from "./network";

export const SUI_RPC_UNAVAILABLE_CODE = "sui_rpc_unavailable" as const;

export type SuiRpcProbeResult =
  | { ok: true; rpc_host: string }
  | { ok: false; rpc_host: string; http_status?: number; detail: string };

const RPC_PROBE_METHOD = "suix_getLatestSuiSystemState";

export function isSuiRpcHttpFailureMessage(message: string): boolean {
  return /Unexpected status code: \d+/.test(message);
}

export function classifySuiRpcError(error: unknown): {
  code: typeof SUI_RPC_UNAVAILABLE_CODE;
  message: string;
  http_status?: number;
  rpc_host: string;
} | null {
  if (!(error instanceof Error)) return null;
  if (!isSuiRpcHttpFailureMessage(error.message)) return null;
  const match = /Unexpected status code: (\d+)/.exec(error.message);
  const { rpc_host } = getRpcDiagnostics();
  return {
    code: SUI_RPC_UNAVAILABLE_CODE,
    message: "Sui RPC unavailable",
    http_status: match ? Number.parseInt(match[1] ?? "", 10) : undefined,
    rpc_host,
  };
}

export async function probeConfiguredSuiJsonRpc(
  fetchImpl: typeof fetch = fetch,
): Promise<SuiRpcProbeResult> {
  const rpcUrl = getSuiRpcUrl();
  const rpc_host = rpcHostFromUrl(rpcUrl);

  try {
    const res = await fetchImpl(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: RPC_PROBE_METHOD,
        params: [],
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        ok: false,
        rpc_host,
        http_status: res.status,
        detail: `JSON-RPC HTTP ${res.status}`,
      };
    }

    const body = await res.json() as { error?: { message?: string }; result?: unknown };
    if (body.error) {
      return {
        ok: false,
        rpc_host,
        detail: body.error.message ?? "JSON-RPC error",
      };
    }

    return { ok: true, rpc_host };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "JSON-RPC probe failed";
    return { ok: false, rpc_host, detail };
  }
}
