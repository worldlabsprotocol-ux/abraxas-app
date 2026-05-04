// FILE: lib/solana/vaultPda.ts
// Vault PDA schema and derivation.
// No Anchor program is deployed yet — PDA is derived client-side and stored
// in the vault memo on-chain. When a program is deployed, the seed and
// discriminator match this schema exactly.
//
// PDA DESIGN (ready for Anchor program integration):
//   seed:   ["abraxas_vault", owner_pubkey]
//   space:  8 (discriminator) + 32 (owner) + 1 (agent_type) +
//           1 (risk_score) + 1 (circuit_state) + 8 (last_updated) + 1 (version)
//           = 52 bytes
//
// CURRENT STATE: Simulated. PDA is derived and logged on-chain via memo.
// When program is deployed: replace simulateCreateVault with real CPI.

import { PublicKey } from "@solana/web3.js";

// Program ID — update when Anchor program is deployed to mainnet/devnet
export const ABRAXAS_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_ABRAXAS_PROGRAM_ID
    ?? "11111111111111111111111111111111" // System program as placeholder
);

export const VAULT_SEED = "abraxas_vault";

export type CircuitState = 0 | 1 | 2 | 3; // LOW=0, MEDIUM=1, HIGH=2, CRITICAL=3
export type AgentType    = 0 | 1 | 2;      // balanced=0, aggressive=1, conservative=2

export interface VaultAccount {
  // On-chain fields (matches future Anchor account layout)
  owner:         string;   // base58 Pubkey
  agentType:     AgentType;
  riskScore:     number;   // 0–100 (u8)
  circuitState:  CircuitState;
  lastUpdated:   number;   // Unix timestamp (i64)
  version:       number;   // u8, starts at 1
  // Derived / off-chain fields
  pda:           string;   // computed PDA address
  mintAddress?:  string;   // Token-2022 vault NFT
  txSignature?:  string;   // creation tx
  simulated:     boolean;
}

export function deriveVaultPda(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED), owner.toBytes()],
    ABRAXAS_PROGRAM_ID
  );
}

// Map strategy string → AgentType u8
export function agentTypeFromStrategy(strategy: string): AgentType {
  if (strategy === "aggressive")   return 1;
  if (strategy === "conservative") return 2;
  return 0; // balanced
}

// Map AgentType → strategy string
export function strategyFromAgentType(t: AgentType): string {
  return ["balanced", "aggressive", "conservative"][t] ?? "balanced";
}

// Map CircuitState u8 → string
export const CIRCUIT_STATE_LABELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export function circuitStateFromScore(score: number): CircuitState {
  if (score >= 75) return 3;
  if (score >= 50) return 2;
  if (score >= 25) return 1;
  return 0;
}

// Bounds enforcement — matches what on-chain program would do
export function clampRiskScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Sophia risk reduction per strategy — deterministic bounds (matches vaultEngine.ts)
export const STRATEGY_REDUCTION: Record<string, { min: number; max: number }> = {
  balanced:     { min: 20, max: 30 },
  aggressive:   { min: 30, max: 40 },
  conservative: { min: 10, max: 20 },
};