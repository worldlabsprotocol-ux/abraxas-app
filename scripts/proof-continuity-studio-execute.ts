#!/usr/bin/env tsx
/**
 * Human/operator step for Integration Studio blockchain-native path.
 * Runs the local ProgramTest journey when RECEIPT_ID is set; otherwise prints pinned env requirements.
 */
import { spawnSync } from "node:child_process";

const receiptId = process.env.ABRAXAS_STUDIO_RECEIPT_ID?.trim();
const rpc = process.env.ABRAXAS_PROOF_CONTINUITY_RPC_URL?.trim();
const admin = process.env.ABRAXAS_PROOF_CONTINUITY_REGISTRY_ADMIN?.trim();

if (!rpc || !admin) {
  console.error("Set ABRAXAS_PROOF_CONTINUITY_RPC_URL and ABRAXAS_PROOF_CONTINUITY_REGISTRY_ADMIN.");
  process.exit(1);
}

if (!receiptId) {
  console.log("Integration Studio prepare step complete. Set ABRAXAS_STUDIO_RECEIPT_ID to the prepared receipt_id.");
  console.log(`Pinned RPC: ${rpc}`);
  console.log(`Registry admin: ${admin}`);
  console.log("For a full local signed transaction, run:");
  console.log("  cd solana/abraxas-eligibility-gate && cargo test --test blockchain_native_journey blockchain_native_launchpad_local_journey -- --nocapture");
  process.exit(0);
}

console.log(`Receipt target: ${receiptId}`);
const cargo = spawnSync(
  "cargo",
  ["test", "--test", "blockchain_native_journey", "blockchain_native_launchpad_local_journey", "--", "--nocapture"],
  {
    cwd: "solana/abraxas-eligibility-gate",
    stdio: "inherit",
    env: { ...process.env, DUMP_PROOF_CONTINUITY_COMMITMENT_HEX: process.env.DUMP_PROOF_CONTINUITY_COMMITMENT_HEX ?? "" },
  },
);
process.exit(cargo.status ?? 1);