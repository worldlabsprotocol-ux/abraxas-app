#!/usr/bin/env npx tsx
/**
 * Build #535 Phase 2 — devnet deployment preflight (default DRY RUN).
 */
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Connection, PublicKey } from "@solana/web3.js";
import { ABRAXAS_TRUST_REGISTRY_PROGRAM_ID } from "@/lib/solana/trustRegistry/constants";

const SO = "/workspace/solana/abraxas-eligibility-gate/target/deploy/abraxas_trust_registry.so";
const KEYPAIR = "/workspace/solana/abraxas-eligibility-gate/target/deploy/abraxas_trust_registry-keypair.json";
const EXPECTED_DIGEST = "fc7780abd4f413505cb04fd0323fb958649311aa8d8ac8899e302fd3ded5b986";
const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";

async function genesisHash(rpc: string): Promise<string | null> {
  try {
    const c = new Connection(rpc, "confirmed");
    return await c.getGenesisHash();
  } catch {
    return null;
  }
}

async function programExecutable(rpc: string): Promise<boolean | null> {
  try {
    const c = new Connection(rpc, "finalized");
    const info = await c.getAccountInfo(new PublicKey(ABRAXAS_TRUST_REGISTRY_PROGRAM_ID), "finalized");
    return info != null && info.executable === true;
  } catch {
    return null;
  }
}

async function main() {
  const primaryRpc = process.env.SOLANA_DEVNET_RPC_URL ?? "https://api.devnet.solana.com";
  const observeRpc =
    process.env.SOLANA_DEVNET_OBSERVE_RPC_URL ?? process.env.SOLANA_DEVNET_RPC_URL ?? "https://api.devnet.solana.com";

  const deployAuthorized = process.env.ABRAXAS_TRUST_REGISTRY_DEPLOY_AUTHORIZED === "true";
  const deployWalletPath = process.env.SOLANA_DEPLOY_WALLET ?? null;
  const upgradeAuthority = process.env.SOLANA_UPGRADE_AUTHORITY ?? null;

  const digest = existsSync(SO)
    ? createHash("sha256").update(readFileSync(SO)).digest("hex")
    : null;

  let programKeypairPubkey: string | null = null;
  if (existsSync(KEYPAIR)) {
    programKeypairPubkey = execSync(`solana-keygen pubkey "${KEYPAIR}"`, { encoding: "utf8" }).trim();
  }

  let deployWalletPubkey: string | null = null;
  let deployWalletBalanceLamports: number | null = null;
  if (deployWalletPath && existsSync(deployWalletPath)) {
    deployWalletPubkey = execSync(`solana-keygen pubkey "${deployWalletPath}"`, { encoding: "utf8" }).trim();
    try {
      const c = new Connection(primaryRpc, "confirmed");
      deployWalletBalanceLamports = await c.getBalance(new PublicKey(deployWalletPubkey));
    } catch {
      deployWalletBalanceLamports = null;
    }
  }

  const [gPrimary, gObserve, exePrimary, exeObserve] = await Promise.all([
    genesisHash(primaryRpc),
    genesisHash(observeRpc),
    programExecutable(primaryRpc),
    programExecutable(observeRpc),
  ]);

  const blockers: string[] = [];
  if (!deployAuthorized) blockers.push("Set ABRAXAS_TRUST_REGISTRY_DEPLOY_AUTHORIZED=true after operator approval");
  if (!deployWalletPath) blockers.push("Set SOLANA_DEPLOY_WALLET to payer keypair path (never commit key material)");
  if (deployWalletPath && !existsSync(deployWalletPath)) blockers.push("SOLANA_DEPLOY_WALLET path missing on disk");
  if (deployWalletBalanceLamports != null && deployWalletBalanceLamports < 2_000_000_000) {
    blockers.push("Deploy wallet SOL balance below 2 SOL recommended for program deploy + init");
  }
  if (digest !== EXPECTED_DIGEST) blockers.push("Artifact digest mismatch — rebuild with build-trust-registry.sh");
  if (programKeypairPubkey !== ABRAXAS_TRUST_REGISTRY_PROGRAM_ID) {
    blockers.push("Program deployment keypair pubkey mismatch");
  }
  if (gPrimary !== DEVNET_GENESIS) blockers.push("Primary RPC genesis hash mismatch (not devnet?)");
  const observeRpcConfigured = Boolean(process.env.SOLANA_DEVNET_OBSERVE_RPC_URL);
  if (observeRpcConfigured && gObserve !== DEVNET_GENESIS) {
    blockers.push("Observation RPC genesis hash mismatch");
  }
  const program_not_deployed_yet = exePrimary === false;
  if (exePrimary !== exeObserve && exePrimary != null && exeObserve != null) {
    blockers.push("RPC disagreement on program executable flag");
  }
  if (!upgradeAuthority) blockers.push("Document SOLANA_UPGRADE_AUTHORITY pubkey for release record");

  const report = {
    schema: "trust_registry_devnet_preflight_v535",
    mode: deployAuthorized ? "AUTHORIZED_PREFLIGHT" : "DRY_RUN",
    cluster: "devnet",
    expected_genesis_hash: DEVNET_GENESIS,
    rpc: { primary: primaryRpc, observe: observeRpc },
    genesis: {
      primary: gPrimary,
      observe: gObserve,
      devnet_confirmed: gPrimary === DEVNET_GENESIS,
      dual_rpc_match: gPrimary != null && gObserve != null && gPrimary === gObserve,
      observe_rpc_operator_supplied: observeRpcConfigured,
    },
    program_id: ABRAXAS_TRUST_REGISTRY_PROGRAM_ID,
    program_deployed_executable: { primary: exePrimary, observe: exeObserve },
    program_not_deployed_yet,
    artifact_digest: digest,
    program_keypair_pubkey: programKeypairPubkey,
    deploy_wallet_pubkey: deployWalletPubkey,
    deploy_wallet_balance_lamports: deployWalletBalanceLamports,
    upgrade_authority: upgradeAuthority,
    operator_authorization: deployAuthorized,
    blocked: blockers.length > 0,
    blockers,
    operator_next_steps: [
      "Fund SOLANA_DEPLOY_WALLET on devnet",
      "Confirm upgrade authority custody",
      "Run: npm run live:trust-registry-devnet-535 (only after explicit approval env)",
      "Or deploy manually: solana program deploy target/deploy/abraxas_trust_registry.so --url devnet --program-id target/deploy/abraxas_trust_registry-keypair.json",
    ],
  };

  const out = "/opt/cursor/artifacts/trust-registry-devnet-preflight-v535.json";
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (report.blocked && !deployAuthorized) process.exit(0);
  if (report.blocked && deployAuthorized) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
