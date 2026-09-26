#!/usr/bin/env npx tsx
// Human-operated devnet proof. Never runs in CI, Vercel, a browser, or an API.
import { lstatSync, readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { Connection, Keypair, PublicKey, Transaction, type AccountInfo } from "@solana/web3.js";
import { automatedEnvironmentForbidden } from "@/lib/partner/testnetGateDeploymentKit/deploy";
import { inspectSolanaProtocolAccessAfterInitialize } from "@/lib/partner/testnetGateDeploymentKit/solanaProtocolAccessPostcheck";
import { inspectInstitutionalSolanaDevnetProof } from "@/lib/partner/testnetGateDeploymentKit/solanaDevnetProofObserve";
import { prepareInstitutionalSolanaDevnetProofPacket, REVIEWED_INSTITUTIONAL_DEVNET, type InstitutionalSolanaAttestation } from "@/lib/partner/chainAttestation/solanaDevnetProofPacket";
import { hexToBytes } from "@/lib/partner/chainAttestation/solanaMessage";

async function main(): Promise<void> {
  const fail = (reason: string, signature?: string, broadcast: boolean | "unknown" = Boolean(signature)): never => {
    process.stdout.write(`${JSON.stringify({ ok: false, reason, ...(signature ? { signature } : {}), broadcast })}\n`);
    process.exit(1);
  };
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[2] !== "--ownership-reviewed" || args[3] !== "--confirm") {
    process.stderr.write("usage: npx tsx scripts/solana-devnet-proof-run-local.ts <issued-attestation.json> <public-signer-document.json> --ownership-reviewed --confirm\n");
    process.exit(2);
  }
  if (automatedEnvironmentForbidden() || !process.stdin.isTTY || !process.stdout.isTTY) fail("automated_environment_forbidden");
  const readJson = (path: string, max: number): unknown => {
    if (!isAbsolute(path) || statSync(path).size > max) throw new Error("invalid_file");
    return JSON.parse(readFileSync(path, "utf8"));
  };
  let attestation: InstitutionalSolanaAttestation, signerDocument: unknown;
  try {
    attestation = readJson(args[0], 16384) as InstitutionalSolanaAttestation;
    signerDocument = readJson(args[1], 65536);
  } catch { fail("invalid_input_file"); }
  const keypairPath = process.env.ABRAXAS_GATE_ADMIN_KEYPAIR_PATH?.trim() ?? "";
  if (!keypairPath || !isAbsolute(keypairPath)) fail("missing_admin_keypair_path");
  let payer: Keypair;
  try {
    const checked = realpathSync(keypairPath);
    const insideRepo = relative(process.cwd(), checked);
    if (!insideRepo.startsWith("..") && !isAbsolute(insideRepo)) throw new Error("keypair_in_repo");
    const file = lstatSync(keypairPath);
    if (!file.isFile() || file.isSymbolicLink() || file.size > 1024
      || (process.platform !== "win32" && (file.mode & 0o077) !== 0)) throw new Error("unsafe_keypair_file");
    const bytes: unknown = JSON.parse(readFileSync(checked, "utf8"));
    if (!Array.isArray(bytes) || bytes.length !== 64 || !bytes.every((v) => Number.isInteger(v) && v >= 0 && v <= 255)) throw new Error("invalid_keypair");
    payer = Keypair.fromSecretKey(Uint8Array.from(bytes));
  } catch { fail("invalid_admin_keypair"); }
  const rawUrl = process.env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL?.trim() || "https://api.devnet.solana.com";
  let url: URL;
  try {
    url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.hash) throw new Error("invalid_url");
  } catch { fail("rpc_unavailable"); }
  const connection = new Connection(url.toString(), "finalized");
  const observation = () => inspectSolanaProtocolAccessAfterInitialize({
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
  let packet;
  try {
    packet = prepareInstitutionalSolanaDevnetProofPacket({
      attestation, signerPublicKey: REVIEWED_INSTITUTIONAL_DEVNET.signerPublicKey,
      payer: payer.publicKey.toBase58(),
    });
  } catch { fail("attestation_invalid_or_expired"); }
  const first = await observation();
  if (!first.ok || first.gate_config_pda !== REVIEWED_INSTITUTIONAL_DEVNET.gateConfig
    || first.protocol_config_pda !== REVIEWED_INSTITUTIONAL_DEVNET.protocolConfig) fail("deployment_postcheck_failed");
  const authorization = new PublicKey(packet.authorization);
  const entitlement = new PublicKey(packet.entitlement);
  if (await connection.getAccountInfo(authorization, "finalized")) fail("authorization_already_exists");
  const tx = (blockhash: string) => {
    const transaction = new Transaction({ feePayer: payer.publicKey, recentBlockhash: blockhash });
    transaction.add(...packet.instructions);
    transaction.sign(payer);
    return transaction;
  };
  const simulationBlockhash = await connection.getLatestBlockhash("finalized");
  const simulation = await connection.simulateTransaction(tx(simulationBlockhash.blockhash));
  if (simulation.value.err !== null) fail("simulation_failed");
  const second = await observation();
  if (!second.ok || JSON.stringify(second) !== JSON.stringify(first)) fail("deployment_changed");
  if (await connection.getAccountInfo(authorization, "finalized")) fail("authorization_already_exists");
  // The server nonce is already consumed at issuance. Send once; an uncertain send must be inspected, not retried.
  let signature: string;
  let blockhash: { blockhash: string; lastValidBlockHeight: number };
  try {
    blockhash = await connection.getLatestBlockhash("finalized");
    signature = await connection.sendRawTransaction(tx(blockhash.blockhash).serialize(), {
      skipPreflight: false, preflightCommitment: "finalized",
    });
  } catch { fail("send_outcome_unknown", undefined, "unknown"); }
  try {
    const confirmation = await connection.confirmTransaction({ signature, ...blockhash }, "finalized");
    if (confirmation.value.err !== null) fail("transaction_failed", signature);
  } catch { fail("transaction_unconfirmed", signature); }
  let authAccount: AccountInfo<Buffer> | null;
  let entitlementAccount: AccountInfo<Buffer> | null;
  try {
    authAccount = await connection.getAccountInfo(authorization, "finalized");
    entitlementAccount = await connection.getAccountInfo(entitlement, "finalized");
  } catch { fail("postcheck_rpc_unavailable", signature); }
  const observed = inspectInstitutionalSolanaDevnetProof({
    authorization: authAccount ? { owner: authAccount.owner.toBase58(), data: authAccount.data } : null,
    entitlement: entitlementAccount ? { owner: entitlementAccount.owner.toBase58(), data: entitlementAccount.data } : null,
    message: hexToBytes(attestation.solana_message),
  });
  if (!observed.ok) fail(`postcheck_${observed.reason}`, signature);
  // Replay is simulated only; no second transaction or fee is sent.
  let replayDenied: boolean;
  try {
    const replayBlockhash = await connection.getLatestBlockhash("finalized");
    const replay = await connection.simulateTransaction(tx(replayBlockhash.blockhash));
    replayDenied = replay.value.err !== null;
  } catch { fail("replay_simulation_unavailable", signature); }
  if (!replayDenied) fail("replay_simulation_unexpected_success", signature);
  const proofUrl = new URL("/proofs/solana-devnet", "https://demo.abraxasworld.xyz");
  proofUrl.searchParams.set("signature", signature);
  process.stdout.write(`${JSON.stringify({ ok: true, network_id: "solana_devnet", signature,
    proof_url: proofUrl.toString(), next_step: "Open proof_url to verify the finalized transaction.",
    authorization_pda: packet.authorization, entitlement_pda: packet.entitlement,
    authorization_consumed: true, entitlement_valid_until: observed.valid_until,
    replay_simulation_denied: true, replay_broadcast: false, broadcast: true }, null, 2)}\n`);
}

void main().catch(() => {
  process.stdout.write('{"ok":false,"reason":"proof_runner_unavailable","broadcast":"unknown"}\n');
  process.exit(1);
});

