#!/usr/bin/env npx tsx
// Offline instruction packet only. Never reads a keypair, connects to RPC, signs, or broadcasts.
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { prepareSolanaGateConfigInitialize } from "@/lib/partner/testnetGateDeploymentKit/solanaConfigInitialize";

const args = process.argv.slice(2);
if (args.length !== 1 || !args[0] || args[0].startsWith("-")) {
  process.stderr.write("usage: npx tsx scripts/solana-gate-config-initialize-packet.ts /path/to/public-signer-document.json\n");
  process.exit(2);
}
let signerDocument: unknown;
try {
  const path = resolve(args[0]);
  if (statSync(path).size > 65536) throw new Error("document_too_large");
  signerDocument = JSON.parse(readFileSync(path, "utf8")) as unknown;
} catch {
  process.stdout.write('{"ok":false,"reason":"invalid_signer_document","broadcast":false}\n');
  process.exit(1);
}
const result = prepareSolanaGateConfigInitialize({
  partnerId: process.env.ABRAXAS_GATE_PARTNER_ID ?? "",
  applicationId: process.env.ABRAXAS_GATE_APPLICATION_ID ?? "",
  adminPubkey: process.env.ABRAXAS_GATE_ADMIN_PUBKEY ?? "",
  signerKeyId: process.env.ABRAXAS_GATE_SIGNER_KEY_ID ?? "",
  signerDocument,
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exit(result.ok ? 0 : 1);

