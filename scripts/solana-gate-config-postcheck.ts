#!/usr/bin/env npx tsx
// Public RPC verification only; no keypair, signing, registration, or broadcast.
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { inspectSolanaGateConfigAfterInitialize } from "@/lib/partner/testnetGateDeploymentKit/solanaGateConfigPostcheck";
import { buildVerifiedSolanaDevnetRegistryManifest } from "@/lib/partner/testnetGateDeploymentKit/solanaDevnetRegistryManifest";
import { prepareSolanaProtocolAccessPacket } from "@/lib/partner/testnetGateDeploymentKit/solanaProtocolAccessPacket";

const manifestMode = process.argv.length === 4 && process.argv[3] === "--manifest";
const consumerMode = process.argv.length === 4 && process.argv[3] === "--consumer-packet";
if ((!manifestMode && !consumerMode && process.argv.length !== 3) || !process.argv[2] || process.argv[2].startsWith("-")) {
  process.stderr.write("usage: npx tsx scripts/solana-gate-config-postcheck.ts /path/to/public-signer-document.json [--manifest|--consumer-packet]\n");
  process.exit(2);
}
let signerDocument: unknown;
try {
  const path = resolve(process.argv[2]);
  if (statSync(path).size > 65536) throw new Error("too_large");
  signerDocument = JSON.parse(readFileSync(path, "utf8")) as unknown;
} catch {
  process.stdout.write('{"ok":false,"reason":"invalid_signer_document","broadcast":false}\n');
  process.exit(1);
}
const rawUrl = process.env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL?.trim() || "https://api.devnet.solana.com";
let url: URL;
try {
  url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.hash) throw new Error("invalid_url");
} catch {
  process.stdout.write('{"ok":false,"reason":"rpc_unavailable","broadcast":false}\n');
  process.exit(1);
}
let requestId = 0;
async function rpc(method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST", headers: { "content-type": "application/json" },
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
const input = {
  partnerId: process.env.ABRAXAS_GATE_PARTNER_ID ?? "",
  applicationId: process.env.ABRAXAS_GATE_APPLICATION_ID ?? "",
  adminPubkey: process.env.ABRAXAS_GATE_ADMIN_PUBKEY ?? "",
  signerKeyId: process.env.ABRAXAS_GATE_SIGNER_KEY_ID ?? "",
  signerDocument,
  genesis: async () => {
    const value = await rpc("getGenesisHash", []);
    return typeof value === "string" ? value : null;
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
};
const result = manifestMode
  ? await buildVerifiedSolanaDevnetRegistryManifest(input)
  : consumerMode ? await prepareSolanaProtocolAccessPacket(input)
  : await inspectSolanaGateConfigAfterInitialize(input);
process.stdout.write(`${JSON.stringify(manifestMode && result.ok && "manifest" in result ? result.manifest : result, null, 2)}\n`);
process.exit(result.ok ? 0 : 1);
