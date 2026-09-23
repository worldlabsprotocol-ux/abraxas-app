#!/usr/bin/env npx tsx
// Public, read-only Solana RPC inspection. Never loads keypairs, signs, or broadcasts.
import { inspectSolanaDevnetBeforeConfig } from "@/lib/partner/testnetGateDeploymentKit/solanaDevnetChainPrecheck";

const adminPubkey = process.env.ABRAXAS_GATE_ADMIN_PUBKEY ?? "";
const rpcUrl = process.env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL?.trim() || "https://api.devnet.solana.com";
let url: URL;
try {
  url = new URL(rpcUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.hash) throw new Error("invalid_rpc_url");
} catch {
  process.stdout.write('{"ok":false,"reason":"rpc_unavailable","broadcast":false}\n');
  process.exit(1);
}

let requestId = 0;
async function rpc(method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++requestId, method, params }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok || Number(response.headers.get("content-length") ?? 0) > 2000000) throw new Error("rpc_unavailable");
  const raw = await response.text();
  if (raw.length > 2000000) throw new Error("rpc_unavailable");
  const parsed = JSON.parse(raw) as { result?: unknown; error?: unknown };
  if (parsed.error || parsed.result === undefined) throw new Error("rpc_unavailable");
  return parsed.result;
}

const result = await inspectSolanaDevnetBeforeConfig({
  adminPubkey,
  genesis: async () => {
    const hash = await rpc("getGenesisHash", []);
    return typeof hash === "string" ? hash : null;
  },
  readAccount: async (pubkey) => {
    const result = await rpc("getAccountInfo", [pubkey, { encoding: "base64", commitment: "finalized" }]);
    if (!result || typeof result !== "object" || !("value" in result)) return { unavailable: true };
    const value = (result as { value?: unknown }).value;
    if (value === null) return null;
    if (!value || typeof value !== "object") return { unavailable: true };
    const row = value as { owner?: unknown; data?: unknown };
    if (typeof row.owner !== "string" || !Array.isArray(row.data)
      || typeof row.data[0] !== "string" || row.data[1] !== "base64") return { unavailable: true };
    if (row.data[0].length > 1500000) return { unavailable: true };
    return { owner: row.owner, data: Buffer.from(row.data[0], "base64") };
  },
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exit(result.ok ? 0 : 1);

