// Read-only Devnet ceiling from actual built ELF lengths and live rent responses.
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { Connection } from "@solana/web3.js";

const root = resolve(import.meta.dirname, "../..");
const manifest = JSON.parse(readFileSync(resolve(root, "solana/abraxas-eligibility-gate/release/devnet-entitlement-identity.json"), "utf8"));
const rpc = process.env.ABRAXAS_DEVNET_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(rpc, "confirmed");
const genesis = await connection.getGenesisHash();
if (genesis !== manifest.genesis_hash) throw new Error("RPC genesis differs from approved Devnet genesis");

const lengths = ["abraxas_proof_continuity", "abraxas_proof_entitlement_consumer"].map((name) =>
  statSync(resolve(root, `solana/abraxas-eligibility-gate/target/deploy/${name}.so`)).size);
if (lengths.some((size) => size < 100_000 || size > 5_000_000)) throw new Error("Unexpected ELF length");
let rent = 0;
let peakBufferRent = 0;
for (const size of lengths) {
  // Upgradeable loader: program metadata, ProgramData, and temporary buffer.
  // The first deployment allocates the current ELF length. Later upgrades can
  // extend the account with separate authority and funding approval.
  rent += await connection.getMinimumBalanceForRentExemption(36);
  rent += await connection.getMinimumBalanceForRentExemption(45 + size);
  peakBufferRent = Math.max(peakBufferRent, await connection.getMinimumBalanceForRentExemption(37 + size));
}
// Deployments are sequential; the loader returns buffer lamports to the payer
// on successful deploy. Reserve the larger temporary buffer once.
rent += peakBufferRent;
// Conservative upper reserve for registry, relying-party config, Token-2022 mint,
// holder ATA, and the first entitlement lifecycle. Actual account allocations
// are checked against the approved ceiling again at execution time.
rent += 10 * await connection.getMinimumBalanceForRentExemption(8192);
const feeReserve = 100_000_000; // 0.1 Devnet SOL, including retries.
const safetyReserve = Math.ceil((rent + feeReserve) * 0.2);
const ceilingLamports = rent + feeReserve + safetyReserve;
console.log(JSON.stringify({
  genesis_hash: genesis, rpc, elf_lengths: lengths,
  rent_upper_lamports: rent, fee_reserve_lamports: feeReserve,
  safety_reserve_lamports: safetyReserve, ceiling_lamports: ceilingLamports,
  ceiling_devnet_sol: ceilingLamports / 1_000_000_000,
}, null, 2));

