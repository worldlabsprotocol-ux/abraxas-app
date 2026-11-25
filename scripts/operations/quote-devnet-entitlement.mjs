// Read-only Devnet ceiling from actual built ELF lengths and live rent responses.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { Connection, PublicKey } from "@solana/web3.js";
import { programAllocationBytes } from "./devnet-entitlement-allocation.mjs";

const root = resolve(import.meta.dirname, "../..");
const manifest = JSON.parse(readFileSync(resolve(root, "solana/abraxas-eligibility-gate/release/devnet-entitlement-identity.json"), "utf8"));
const rpc = process.env.ABRAXAS_DEVNET_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(rpc, "confirmed");
const genesis = await connection.getGenesisHash();
if (genesis !== manifest.genesis_hash) throw new Error("RPC genesis differs from approved Devnet genesis");

const binaries = ["abraxas_proof_continuity", "abraxas_proof_entitlement_consumer"].map((name) => {
  const elf = readFileSync(resolve(root, `solana/abraxas-eligibility-gate/target/deploy/${name}.so`));
  return { name, length: elf.length, allocation_bytes: programAllocationBytes(elf.length),
    sha256: createHash("sha256").update(elf).digest("hex") };
});
const lengths = binaries.map(({ length }) => length);
let rent = 0;
let peakBufferRent = 0;
for (const { length, allocation_bytes } of binaries) {
  // Upgradeable loader: program metadata, ProgramData, and temporary buffer.
  // Reserve 15% growth (minimum 32 KiB), rounded to a 4 KiB boundary.
  rent += await connection.getMinimumBalanceForRentExemption(36);
  rent += await connection.getMinimumBalanceForRentExemption(45 + allocation_bytes);
  peakBufferRent = Math.max(peakBufferRent, await connection.getMinimumBalanceForRentExemption(37 + length));
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
const authority = new PublicKey("3cKi3oxEoFDZ7corbQ1Uk21gxqdgPu3LpH4MN313EnRd");
const authorityBalanceLamports = await connection.getBalance(authority, "confirmed");
console.log(JSON.stringify({
  genesis_hash: genesis, rpc, binaries,
  authority_wallet: authority.toBase58(),
  authority_wallet_balance_lamports: authorityBalanceLamports,
  authority_wallet_funding_shortfall_lamports: Math.max(0, ceilingLamports - authorityBalanceLamports),
  rent_upper_lamports: rent, fee_reserve_lamports: feeReserve,
  safety_reserve_lamports: safetyReserve, ceiling_lamports: ceilingLamports,
  ceiling_devnet_sol: ceilingLamports / 1_000_000_000,
  future_extension: "A larger future ELF requires an authorized, funded Solana program extension or CLI auto-extension before upgrade; re-quote and verify authority first.",
}, null, 2));

