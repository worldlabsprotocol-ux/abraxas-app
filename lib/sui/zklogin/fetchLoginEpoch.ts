// FILE: lib/sui/zklogin/fetchLoginEpoch.ts
// Client helper — epoch comes from server API (uses SUI_RPC_URL), not browser RPC.

import { formatRpcFailure } from "@/lib/sui/rpcDiagnostics";

export interface LoginEpochPayload {
  ok: boolean;
  max_epoch?: number;
  epoch?: number;
  network?: string;
  rpc_host?: string;
  rpc_source?: string;
  error?: string;
  phase?: string;
}

export async function fetchLoginMaxEpoch(): Promise<
  | { ok: true; maxEpoch: number; network: string; rpcHost: string }
  | { ok: false; error: string }
> {
  let res: Response;
  try {
    res = await fetch("/api/auth/zklogin/prepare", { cache: "no-store" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch";
    return {
      ok: false,
      error: formatRpcFailure({
        phase: "prepare_api",
        error: `${message} (could not reach /api/auth/zklogin/prepare — check deployment, not Sui RPC directly)`,
      }),
    };
  }

  const data = (await res.json().catch(() => ({}))) as LoginEpochPayload;

  if (!res.ok || !data.ok || typeof data.max_epoch !== "number") {
    return {
      ok: false,
      error: formatRpcFailure({
        phase: data.phase ?? "sui_epoch_fetch",
        error: data.error ?? `prepare API returned ${res.status}`,
        network: data.network,
        rpc_host: data.rpc_host,
        http_status: res.status,
      }),
    };
  }

  return {
    ok: true,
    maxEpoch: data.max_epoch,
    network: data.network ?? "unknown",
    rpcHost: data.rpc_host ?? "unknown",
  };
}
