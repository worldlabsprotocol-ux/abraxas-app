// FILE: lib/walletAuthority/types.ts

export type WalletChain = "sui" | "evm" | "solana";
export type WalletBindingStatus = "pending" | "active" | "revoked" | "compromised";

export interface WalletBindingRecord {
  id: string;
  subject_id: string;
  chain: WalletChain;
  chain_id: number | null;
  wallet_address: string;
  binding_method: string;
  binding_status: WalletBindingStatus;
  verified_domain: string | null;
  verified_at: string;
  revoked_at: string | null;
  risk_status: string;
}

export interface BindingChallengeRecord {
  id: string;
  wallet_address: string;
  chain: WalletChain;
  chain_id: number | null;
  message: string;
  domain: string;
  subject_id: string | null;
  expires_at: string;
  consumed_at: string | null;
}
