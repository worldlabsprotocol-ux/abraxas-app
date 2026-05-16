// FILE: lib/hooks/useAbraBalance.ts
// Reads real on-chain ABRA SPL balance. Gate = covers the mint fee (not 100k).
"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

export const ABRA_MINT = "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS";

// Realistic minimum: enough to cover the base mint fee.
// NOT 100,000. Removed the exaggerated holding requirement.
export const ABRA_MIN_FEE = 110; // minimum fee across all asset classes

export function useAbraBalance() {
  const { connection }            = useConnection();
  const { publicKey, connected }  = useWallet();
  const [balance,  setBalance]    = useState<number>(0);
  const [loading,  setLoading]    = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!publicKey || !connected) { setBalance(0); return; }
    setLoading(true);
    try {
      const mint = new PublicKey(ABRA_MINT);
      const { getAssociatedTokenAddress } = await import("@solana/spl-token");
      const ata  = await getAssociatedTokenAddress(mint, publicKey);
      const info = await connection.getTokenAccountBalance(ata);
      setBalance(Number(info.value.uiAmount ?? 0));
    } catch {
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connected, connection]);

  useEffect(() => {
    fetchBalance();
    const iv = setInterval(fetchBalance, 30_000);
    return () => clearInterval(iv);
  }, [fetchBalance]);

  return { balance, loading, refetch: fetchBalance };
}