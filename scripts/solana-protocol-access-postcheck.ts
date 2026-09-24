#!/usr/bin/env npx tsx
// Read-only devnet observation. No keypair, signing, registration, or broadcast.
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { Connection, PublicKey } from "@solana/web3.js";
import { inspectSolanaProtocolAccessAfterInitialize } from "@/lib/partner/testnetGateDeploymentKit/solanaProtocolAccessPostcheck";

async function main(): Promise<void> {
  if (process.argv.length !== 3 || !process.argv[2] || process.argv[2].startsWith("-")) {
    process.stderr.write("usage: npx tsx scripts/solana-protocol-access-postcheck.ts /path/to/public-signer-document.json\n");
    process.exit(2);
  }
  const fail = (reason: string): never => {
    process.stdout.write(`${JSON.stringify({ ok: false, reason, broadcast: false })}\n`);
    process.exit(1);
  };
  let signerDocument: unknown;
  try {
    const path = resolve(process.argv[2]);
    if (statSync(path).size > 65536) throw new Error("too_large");
    signerDocument = JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch { fail("invalid_signer_document"); }
  const rawUrl = process.env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL?.trim() || "https://api.devnet.solana.com";
  let url: URL;
  try {
    url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.hash) throw new Error("invalid_url");
  } catch { fail("rpc_unavailable"); }
  const connection = new Connection(url.toString(), "finalized");
  const result = await inspectSolanaProtocolAccessAfterInitialize({
    partnerId: process.env.ABRAXAS_GATE_PARTNER_ID ?? "",
    applicationId: process.env.ABRAXAS_GATE_APPLICATION_ID ?? "",
    adminPubkey: process.env.ABRAXAS_GATE_ADMIN_PUBKEY ?? "",
    signerKeyId: process.env.ABRAXAS_GATE_SIGNER_KEY_ID ?? "",
    signerDocument,
    genesis: async () => connection.getGenesisHash(),
    readAccount: async (key) => {
      const account = await connection.getAccountInfo(new PublicKey(key), "finalized");
      return account ? { owner: account.owner.toBase58(), data: account.data } : null;
    },
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.ok ? 0 : 1);
}

void main().catch(() => {
  process.stdout.write('{"ok":false,"reason":"postcheck_failed","broadcast":false}\n');
  process.exit(1);
});

