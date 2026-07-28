// FILE: lib/sui/zklogin/fetchLoginEpoch.ts
// Client helper — epoch comes from server API (uses SUI_RPC_URL), not browser RPC.

import { formatRpcFailure } from "@/lib/sui/rpcDiagnostics";

import { ZKLOGIN_PREPARE_PATH } from "./constants";

export interface LoginEpochPayload {
  ok: boolean;
  api_version?: string;
  max_epoch?: number;
  epoch?: number;
  network?: string;
  rpc_host?: string;
  rpc_source?: string;
  error?: string;
  phase?: string;
}

function deploymentMissingMessage(status: number, body: LoginEpochPayload): string {
  if (status === 501 && body.error === "auth not configured") {
    return (
      "Sign-in prepare API is not deployed on this domain yet "
      + `(GET ${ZKLOGIN_PREPARE_PATH} returned 501). `
      + "Merge and deploy PR #76 (auth-session-root-cause) to production."
    );
  }
  if (status === 404) {
    return (
      `Sign-in prepare API missing (GET ${ZKLOGIN_PREPARE_PATH} returned 404). `
      + "Production is running an outdated deployment."
    );
  }
  return body.error ?? `prepare API returned ${status}`;
}

export async function fetchLoginMaxEpoch(): Promise<
  | { ok: true; maxEpoch: number; network: string; rpcHost: string }
  | { ok: false; error: string }
> {
  let res: Response;
  try {
    res = await fetch(ZKLOGIN_PREPARE_PATH, { cache: "no-store" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch";
    return {
      ok: false,
      error: formatRpcFailure({
        phase: "prepare_api",
        error: `${message} (could not reach ${ZKLOGIN_PREPARE_PATH} — browser must not call Sui RPC directly)`,
      }),
    };
  }

  const data = (await res.json().catch(() => ({}))) as LoginEpochPayload;

  if (!res.ok || !data.ok || typeof data.max_epoch !== "number") {
    const detail = deploymentMissingMessage(res.status, data);
    return {
      ok: false,
      error: formatRpcFailure({
        phase: data.phase ?? "prepare_api",
        error: detail,
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
