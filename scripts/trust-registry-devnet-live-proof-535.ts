#!/usr/bin/env npx tsx
/**
 * Build #535 Phase 3 — authorized live devnet proof orchestrator.
 * Does NOT run unless ABRAXAS_TRUST_REGISTRY_DEPLOY_AUTHORIZED=true and wallets are present.
 * Does not print or persist private keys.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ABRAXAS_TRUST_REGISTRY_PROGRAM_ID } from "@/lib/solana/trustRegistry/constants";

const SO = "/workspace/solana/abraxas-eligibility-gate/target/deploy/abraxas_trust_registry.so";
const PROGRAM_KP = "/workspace/solana/abraxas-eligibility-gate/target/deploy/abraxas_trust_registry-keypair.json";

function blocked(reasons: string[]) {
  return {
    schema: "trust_registry_devnet_live_proof_v535",
    status: "BLOCKED",
    reasons,
    live_devnet_transactions: [],
  };
}

async function main() {
  if (process.env.ABRAXAS_TRUST_REGISTRY_DEPLOY_AUTHORIZED !== "true") {
    const report = blocked([
      "Operator authorization missing: ABRAXAS_TRUST_REGISTRY_DEPLOY_AUTHORIZED !== true",
      "This prompt is not authorization to spend SOL or submit transactions",
    ]);
    console.log(JSON.stringify(report, null, 2));
    const out = "/opt/cursor/artifacts/trust-registry-devnet-live-proof-v535.json";
    mkdirSync("/opt/cursor/artifacts", { recursive: true });
    writeFileSync(out, JSON.stringify(report, null, 2));
    process.exit(0);
  }

  const deployWallet = process.env.SOLANA_DEPLOY_WALLET;
  if (!deployWallet || !existsSync(deployWallet)) {
    const report = blocked(["SOLANA_DEPLOY_WALLET missing or not found"]);
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }
  if (!existsSync(SO) || !existsSync(PROGRAM_KP)) {
    const report = blocked(["Compiled artifact or program keypair missing — run build:trust-registry-sbf"]);
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const deployPubkey = execSync(`solana-keygen pubkey "${deployWallet}"`, { encoding: "utf8" }).trim();
  const programPubkey = execSync(`solana-keygen pubkey "${PROGRAM_KP}"`, { encoding: "utf8" }).trim();
  if (programPubkey !== ABRAXAS_TRUST_REGISTRY_PROGRAM_ID) {
    const report = blocked(["Program keypair pubkey does not match governed program ID"]);
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const rpc = process.env.SOLANA_DEVNET_RPC_URL ?? "https://api.devnet.solana.com";
  const report = blocked([
    "Authorized flag set but automated transaction submission is disabled in cloud agent",
    "Operator must execute deploy + registry lifecycle manually (see docs/protocol/TRUST_REGISTRY_DEVNET_BUILD_535.md)",
    `Suggested deploy: solana program deploy ${SO} --url ${rpc} --keypair ${deployWallet} --program-id ${PROGRAM_KP}`,
    "After live txs, populate ABRAXAS_TRUST_REGISTRY_LIVE_SESSION_JSON and run npm run verify:trust-registry-independent-535",
  ]);

  report.status = "BLOCKED_OPERATOR_EXECUTION";
  (report as { deploy_wallet_pubkey?: string }).deploy_wallet_pubkey = deployPubkey;

  const out = "/opt/cursor/artifacts/trust-registry-devnet-live-proof-v535.json";
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
