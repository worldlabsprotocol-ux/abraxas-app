// FILE: lib/sui/rpcDiagnostics.ts
// Safe RPC endpoint metadata for error messages (no secrets).

import { getSuiNetwork, getSuiRpcUrl } from "./network";

export function rpcHostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "invalid-url";
  }
}

export function getRpcDiagnostics() {
  const network = getSuiNetwork();
  const rpcUrl = getSuiRpcUrl();
  return {
    network,
    rpc_host: rpcHostFromUrl(rpcUrl),
    rpc_source: process.env.SUI_RPC_URL?.trim()
      ? "SUI_RPC_URL"
      : process.env.NEXT_PUBLIC_SUI_RPC_URL?.trim()
        ? "NEXT_PUBLIC_SUI_RPC_URL"
        : "network_default",
  };
}

export function formatRpcFailure(input: {
  phase: string;
  error: string;
  network?: string;
  rpc_host?: string;
  http_status?: number;
}): string {
  const network = input.network ?? "unknown";
  const host = input.rpc_host ?? "unknown";
  const status = input.http_status ? ` HTTP ${input.http_status}` : "";
  return (
    `Sign-in failed during ${input.phase}: ${input.error}${status}. `
    + `Sui network=${network}, RPC host=${host}. `
    + `Verify SUI_RPC_URL in Vercel matches NEXT_PUBLIC_SUI_NETWORK, or set NEXT_PUBLIC_SUI_RPC_URL for client alignment.`
  );
}
