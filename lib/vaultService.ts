// lib/vaultService.ts
// Smart-contract-ready interface layer.
//
// All deposit/withdraw/mint calls go through these functions.
// When a real Solana program exists, replace the simulate* functions
// with actual program calls (using @coral-xyz/anchor or @solana/web3.js).
// The UI never calls Solana directly — it always calls these service functions.
//
// ARCHITECTURE (minimum Solana program needed):
//   1. VaultAccount      — stores TVL, APY, authority, paused flag, circuit breaker
//   2. UserPositionAccount — stores depositor pubkey, amount, mint, opened_at
//   3. deposit_ix        — validate → create position → mint Token-2022 → emit event
//   4. withdraw_ix       — burn Token-2022 → close position → return lamports → emit event
//   5. Token-2022 mint   — InterestBearingConfig extension, metadata pointer
//   6. EventLog          — deposit / withdraw / vault_update / circuit_break events
//   7. AdminAuthority    — pause/unpause vault
//   8. RiskCircuitBreaker— auto-pause on threshold breach
//   9. OraclePriceFeed   — placeholder for real-time pricing (Pyth or Switchboard)

export type TxState =
  | "idle"
  | "validating"
  | "submitting"
  | "confirming"
  | "minting"
  | "active"
  | "withdrawing"
  | "withdrawn"
  | "error";

export interface DepositParams {
  userWallet:   string;
  vaultId:      string;
  vaultName:    string;
  yieldRate:    number;
  depositedUsd: number;
}

export interface DepositResult {
  ok:           boolean;
  simulated:    boolean;
  mintAddress:  string;
  tokenAccount: string;
  txSignature:  string;
  explorerUrl:  string;
  tokenName:    string;
  tokenSymbol:  string;
  metadataUri:  string;
  error?:       string;
}

export interface WithdrawParams {
  userWallet:  string;
  mintAddress: string;
  amount:      number;
  vaultId:     string;
}

export interface WithdrawResult {
  ok:             boolean;
  simulated:      boolean;
  txSignature:    string;
  explorerUrl:    string;
  amountReturned: number;
  error?:         string;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function depositToVault(params: DepositParams): Promise<DepositResult> {
  const res = await fetch("/api/mint/position", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.ok) {
    return { ok: false, simulated: true, mintAddress: "", tokenAccount: "", txSignature: "", explorerUrl: "", tokenName: "", tokenSymbol: "", metadataUri: "", error: data.error };
  }
  return { ok: true, simulated: data.simulated ?? true, ...data };
}

export async function withdrawFromVault(params: WithdrawParams): Promise<WithdrawResult> {
  const res = await fetch("/api/withdraw/position", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.ok) {
    return { ok: false, simulated: true, txSignature: "", explorerUrl: "", amountReturned: 0, error: data.error };
  }
  return { ok: true, simulated: data.simulated ?? true, txSignature: data.txSignature, explorerUrl: data.explorerUrl, amountReturned: data.amountReturned ?? params.amount };
}