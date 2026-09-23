#!/usr/bin/env npx tsx
// Read-only devnet proof after a human initializes GateConfig. No keypair, signing, or broadcast.
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { planSolanaDevnetGateConfig } from "@/lib/partner/testnetGateDeploymentKit/solanaConfigPreflight";
import { inspectProgram, REVIEWED_DEVNET_PROGRAMS, SOLANA_DEVNET_GENESIS_HASH } from "@/lib/partner/testnetGateDeploymentKit/solanaDevnetChainPrecheck";
import { verifyObservedGateConfig } from "@/lib/partner/testnetGateDeploymentKit/solanaGateConfigObservation";

const fail = (reason: string): never => {
  process.stdout.write(`${JSON.stringify({ ok: false, reason, broadcast: false })}\n`);
  process.exit(1);
};
if (process.argv.length !== 3) fail("invalid_input");
let signerDocument: unknown;
try {
  const path = resolve(process.argv[2]);
  if (statSync(path).size > 65536) fail("invalid_signer_document");
  signerDocument = JSON.parse(readFileSync(path, "utf8")) as unknown;
} catch { fail("invalid_signer_document"); }

const checked = planSolanaDevnetGateConfig({
  partnerId: process.env.ABRAXAS_GATE_PARTNER_ID ?? "",
  applicationId: process.env.ABRAXAS_GATE_APPLICATION_ID ?? "",
  adminPubkey: process.env.ABRAXAS_GATE_ADMIN_PUBKEY ?? "",
  signerKeyId: process.env.ABRAXAS_GATE_SIGNER_KEY_ID ?? "",
  signerDocument,
});
if (!checked.ok) fail(checked.reason);
const plan = checked.plan;
const rpcUrl = process.env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL?.trim() || "https://api.devnet.solana.com";
let url: URL;
try {
  url = new URL(rpcUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.hash) fail("rpc_unavailable");
} catch { fail("rpc_unavailable"); }

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
async function readAccount(pubkey: string) {
  const result = await rpc("getAccountInfo", [pubkey, { encoding: "base64", commitment: "finalized" }]);
  if (!result || typeof result !== "object" || !("value" in result)) return { unavailable: true as const };
  const value = (result as { value?: unknown }).value;
  if (value === null) return null;
  if (!value || typeof value !== "object") return { unavailable: true as const };
  const row = value as { owner?: unknown; data?: unknown };
  if (typeof row.owner !== "string" || !Array.isArray(row.data)
    || typeof row.data[0] !== "string" || row.data[1] !== "base64" || row.data[0].length > 1500000) {
    return { unavailable: true as const };
  }
  return { owner: row.owner, data: Buffer.from(row.data[0], "base64") };
}

try {
  if (await rpc("getGenesisHash", []) !== SOLANA_DEVNET_GENESIS_HASH) fail("wrong_cluster");
  const gate = await inspectProgram(REVIEWED_DEVNET_PROGRAMS.gate, readAccount);
  if (gate !== "matched") fail("gate_artifact_mismatch");
  const consumer = await inspectProgram(REVIEWED_DEVNET_PROGRAMS.consumer, readAccount);
  if (consumer !== "matched") fail("consumer_artifact_mismatch");
  const account = await readAccount(plan.gate_config_pda);
  if (account && "unavailable" in account) fail("rpc_unavailable");
  const result = verifyObservedGateConfig(plan, account);
  if (!result.ok) fail(result.reason);
  if (await rpc("getGenesisHash", []) !== SOLANA_DEVNET_GENESIS_HASH) fail("wrong_cluster");
  process.stdout.write(`${JSON.stringify({ ok: true, network_id: plan.network_id,
    gate_program_id: plan.gate_program_id, partner_program_id: plan.partner_program_id,
    gate_config_pda: result.gate_config_pda, config_digest: result.config_digest,
    institutional_v2: true, signer_active: true, onchain_config_observed: true,
    ownership_verified: false, registered: false, broadcast: false }, null, 2)}\n`);
} catch { fail("rpc_unavailable"); }

