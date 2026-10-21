// FILE: lib/walletAuthority/solanaAddress.ts

import { PublicKey } from "@solana/web3.js";

export function normalizeSolanaAddress(walletAddress: string): string {
  return new PublicKey(walletAddress.trim()).toBase58();
}
