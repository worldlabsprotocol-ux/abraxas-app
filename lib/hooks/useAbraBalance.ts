// FILE: lib/hooks/useAbraBalance.ts
// Reads the REAL on-chain ABRA SPL token balance from connected wallet.
// Falls back to 0 if wallet not connected or no ABRA account exists.
// Token: 5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS
"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

export const ABRA_MINT   = "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS";
export const ABRA_GATE   = 100_000;   // min ABRA to qualify for minting
export const MIN_BALANCE  = ABRA_GATE;

export function useAbraBalance() {
  const { connection }        = useConnection();
  const { publicKey, connected } = useWallet();
  const [balance,  setBalance]  = useState<number>(0);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!publicKey || !connected) { setBalance(0); return; }
    setLoading(true);
    setError(null);
    try {
      const mint = new PublicKey(ABRA_MINT);
      // Dynamic import — avoids SSR issues with @solana/spl-token
      const { getAssociatedTokenAddress } = await import("@solana/spl-token");
      const ata  = await getAssociatedTokenAddress(mint, publicKey);
      const info = await connection.getTokenAccountBalance(ata);
      setBalance(Number(info.value.uiAmount ?? 0));
    } catch {
      setBalance(0);  // no ATA = 0 balance (not an error)
    } finally {
      setLoading(false);
    }
  }, [publicKey, connected, connection]);

  useEffect(() => {
    fetchBalance();
    const iv = setInterval(fetchBalance, 30_000);
    return () => clearInterval(iv);
  }, [fetchBalance]);

  return {
    balance,
    loading,
    error,
    meetsGate: balance >= ABRA_GATE,
    refetch:   fetchBalance,
  };
}