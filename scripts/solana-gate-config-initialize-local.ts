#!/usr/bin/env npx tsx
// Human-operated devnet transaction only. This entry point is forbidden in CI, Vercel, tests, and API runtimes.
import { lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { Connection, Keypair, PublicKey, Transaction, type TransactionInstruction } from "@solana/web3.js";
import { automatedEnvironmentForbidden } from "@/lib/partner/testnetGateDeploymentKit/deploy";
import { initializeLocalSolanaGateConfig } from "@/lib/partner/testnetGateDeploymentKit/solanaGateConfigLocalInitialize";

async function main(): Promise<void> {
const fail = (reason: string): never => {
  process.stdout.write(`${JSON.stringify({ ok: false, reason, broadcast: false })}\n`);
  process.exit(1);
};
const args = process.argv.slice(2);
if (args.length !== 3 || !args[0] || args[0].startsWith("-")
  || args[1] !== "--ownership-reviewed" || args[2] !== "--confirm") {
  process.stderr.write("usage: npx tsx scripts/solana-gate-config-initialize-local.ts /path/to/public-signer-document.json --ownership-reviewed --confirm\n");
  process.exit(2);
}
if (automatedEnvironmentForbidden() || !process.stdin.isTTY || !process.stdout.isTTY) {
  fail("automated_environment_forbidden");
}
let signerDocument: unknown;
try {
  const documentPath = resolve(args[0]);
  if (statSync(documentPath).size > 65536) throw new Error("too_large");
  signerDocument = JSON.parse(readFileSync(documentPath, "utf8")) as unknown;
} catch {
  fail("invalid_signer_document");
}
const keypairPath = process.env.ABRAXAS_GATE_ADMIN_KEYPAIR_PATH?.trim() ?? "";
if (!keypairPath || !isAbsolute(keypairPath)) fail("missing_admin_keypair_path");
let admin: Keypair;
try {
  const checkedPath = realpathSync(keypairPath);
  const insideRepo = relative(process.cwd(), checkedPath);
  if (!insideRepo.startsWith("..") && !isAbsolute(insideRepo)) throw new Error("keypair_in_repo");
  const file = lstatSync(keypairPath);
  if (!file.isFile() || file.isSymbolicLink() || file.size > 1024
    || (process.platform !== "win32" && (file.mode & 0o077) !== 0)) throw new Error("unsafe_keypair_file");
  const bytes: unknown = JSON.parse(readFileSync(checkedPath, "utf8"));
  if (!Array.isArray(bytes) || bytes.length !== 64
    || !bytes.every((value) => Number.isInteger(value) && value >= 0 && value <= 255)) throw new Error("invalid_keypair");
  admin = Keypair.fromSecretKey(Uint8Array.from(bytes));
} catch {
  fail("invalid_admin_keypair");
}
const rawUrl = process.env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL?.trim() || "https://api.devnet.solana.com";
let url: URL;
try {
  url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.hash) throw new Error("invalid_url");
} catch {
  fail("rpc_unavailable");
}
const connection = new Connection(url.toString(), "finalized");
let sentBlockhash: { blockhash: string; lastValidBlockHeight: number } | null = null;
function transaction(ix: TransactionInstruction, blockhash: string): Transaction {
  const tx = new Transaction({ feePayer: admin.publicKey, recentBlockhash: blockhash });
  tx.add(ix);
  tx.sign(admin);
  return tx;
}
const result = await initializeLocalSolanaGateConfig({
  partnerId: process.env.ABRAXAS_GATE_PARTNER_ID ?? "",
  applicationId: process.env.ABRAXAS_GATE_APPLICATION_ID ?? "",
  adminPubkey: process.env.ABRAXAS_GATE_ADMIN_PUBKEY ?? "",
  signerKeyId: process.env.ABRAXAS_GATE_SIGNER_KEY_ID ?? "",
  signerDocument,
  confirm: true, ownershipReviewed: true, interactive: true,
  signerPubkey: admin.publicKey.toBase58(), runtimeEnv: process.env,
  chain: {
    genesis: async () => connection.getGenesisHash(),
    readAccount: async (key) => {
      const account = await connection.getAccountInfo(new PublicKey(key), "finalized");
      return account ? { owner: account.owner.toBase58(), data: account.data } : null;
    },
    simulate: async (ix) => {
      const latest = await connection.getLatestBlockhash("finalized");
      const simulation = await connection.simulateTransaction(transaction(ix, latest.blockhash));
      return simulation.value.err === null;
    },
    send: async (ix) => {
      sentBlockhash = await connection.getLatestBlockhash("finalized");
      return connection.sendRawTransaction(transaction(ix, sentBlockhash.blockhash).serialize(), {
        skipPreflight: false, preflightCommitment: "finalized",
      });
    },
    confirm: async (signature) => {
      if (!sentBlockhash) return false;
      const confirmation = await connection.confirmTransaction({ signature, ...sentBlockhash }, "finalized");
      return confirmation.value.err === null;
    },
  },
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exit(result.ok ? 0 : 1);
}

void main().catch(() => {
  process.stdout.write('{"ok":false,"reason":"local_initialize_failed","broadcast":false}\n');
  process.exit(1);
});
