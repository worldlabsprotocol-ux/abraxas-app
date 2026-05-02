// FILE: lib/protocolService.ts
// Protocol service layer. UI calls these functions only.
// Smart contract ready — isolates simulated logic from UI.
// Replace simulate* internals with real Solana program calls when program exists.
//
// MINIMUM SOLANA PROGRAM ARCHITECTURE (not yet deployed):
// 1. VaultAccount        — TVL, APY, authority, paused flag, circuit breaker state
// 2. UserPositionAccount — depositor pubkey, principal, mintAddress, status, createdAt
// 3. deposit_ix          — validate → create position account → mint Token-2022 → emit DepositEvent
// 4. withdraw_ix         — validate ownership → burn Token-2022 → close position → emit WithdrawEvent
// 5. Token-2022 mint     — InterestBearingConfig extension, metadata embedded
// 6. EventLog            — DepositEvent, MintEvent, RebalanceEvent, WithdrawEvent
// 7. AdminAuthority      — pause/unpause vault per circuit breaker
// 8. RiskCircuit         — auto-pause if volatility threshold > 20%
// 9. OracleFeed          — placeholder for Pyth/Switchboard price input

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

// ─── Token-2022 Metadata ──────────────────────────────────────────────────────
// ABRAP represents ownership of a vault position.
// It is NOT a stablecoin. It is NOT a governance token.
// It proves: who deposited, to which vault, how much, when, and current status.

export interface ABRAPMetadata {
  name:            string;   // e.g. "My Music Catalog — VAULT-490"
  symbol:          string;   // always "ABRAP"
  description:     string;
  image:           string;
  vaultId:         string;
  vaultName:       string;
  assetType:       string;
  depositedAmount: number;
  ownerWallet:     string;
  apy:             number;
  createdAt:       string;
  status:          string;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export interface DepositEvent {
  type:         "DepositEvent";
  userWallet:   string;
  vaultId:      string;
  amount:       number;
  timestamp:    number;
  txSignature:  string;
}

export interface MintEvent {
  type:         "MintEvent";
  userWallet:   string;
  vaultId:      string;
  mintAddress:  string;
  timestamp:    number;
  txSignature:  string;
}

export interface WithdrawEvent {
  type:         "WithdrawEvent";
  userWallet:   string;
  vaultId:      string;
  amount:       number;
  timestamp:    number;
  txSignature:  string;
}

export interface RebalanceEvent {
  type:         "RebalanceEvent";
  vaultId:      string;
  rule:         string;
  outcome:      string;
  timestamp:    number;
}

// ─── Service inputs/outputs ───────────────────────────────────────────────────

export interface DepositParams {
  userWallet:    string;
  vaultId:       string;
  vaultName:     string;
  assetType:     string;
  principal:     number;
  apy:           number;
  displayName:   string;
  description:   string;
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
  metadata:     ABRAPMetadata;
  error?:       string;
}

export interface WithdrawParams {
  userWallet:   string;
  positionId:   string;
  mintAddress:  string;
  principal:    number;
  accruedYield: number;
}

export interface WithdrawResult {
  ok:             boolean;
  simulated:      boolean;
  txSignature:    string;
  explorerUrl:    string;
  amountReturned: number;
  error?:         string;
}

// ─── Public API (UI calls these — never calls API routes directly) ────────────

export async function depositToVault(params: DepositParams): Promise<DepositResult> {
  const res = await fetch("/api/mint/position", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.ok) {
    return {
      ok: false, simulated: true,
      mintAddress: "", tokenAccount: "", txSignature: "", explorerUrl: "",
      tokenName: "", tokenSymbol: "",
      metadata: {} as ABRAPMetadata,
      error: data.error ?? "Deposit failed.",
    };
  }
  return { ok: true, ...data };
}

export async function withdrawFromVault(params: WithdrawParams): Promise<WithdrawResult> {
  const res = await fetch("/api/withdraw", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.ok) {
    return { ok: false, simulated: true, txSignature: "", explorerUrl: "", amountReturned: 0, error: data.error ?? "Withdraw failed." };
  }
  return { ok: true, ...data };
}

// Future: getVaultState() — calls VaultAccount on-chain
export async function getVaultState(vaultId: string): Promise<{ tvl: number; apy: number; status: string }> {
  // FUTURE: const vault = await program.account.vault.fetch(vaultPda);
  // CURRENT: return from static appData
  const { VAULTS } = await import("@/lib/appData");
  const v = VAULTS.find((x) => x.id === vaultId);
  return { tvl: v?.tvl ?? 0, apy: v?.apy ?? 0, status: v?.status ?? "operating" };
}

// Agent decision logic — deterministic, not black-box
export function evaluateAgentRule(signal: number, threshold: number, action: string): { fire: boolean; reason: string } {
  if (signal > threshold) {
    return { fire: true, reason: `signal ${signal.toFixed(2)} > threshold ${threshold} → ${action}` };
  }
  return { fire: false, reason: `signal ${signal.toFixed(2)} ≤ threshold ${threshold} → hold` };
}