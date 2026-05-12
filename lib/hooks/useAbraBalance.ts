// FILE: lib/hooks/useAbraBalance.ts
// $ABRA balance = sum of confirmed mint transactions for wallet.
// DB-first when Supabase available. Zustand store balance fallback.
// NEVER hardcoded. No  constant.

"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAbraStore } from "@/lib/abraxasStore";

export function useAbraBalance(wallet?: string) {
  const storeBalance = useAbraStore(s => s.abraBalance);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wallet) {
      // No wallet connected — show store balance as default
      setBalance(storeBalance);
      setLoading(false);
      return;
    }

    if (supabase) {
      // DB path: sum transactions for this wallet
      supabase
        .from("transactions")
        .select("amount_abra")
        .eq("wallet", wallet)
        .eq("type",   "mint")
        .eq("status", "confirmed")
        .then(({ data, error }) => {
          if (error || !data) { setBalance(storeBalance); setLoading(false); return; }
          const total = data.reduce((sum, row) => sum + (row.amount_abra ?? 0), 0);
          setBalance(total);
          setLoading(false);
        });
    } else {
      // Zustand fallback
      setBalance(storeBalance);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, storeBalance]);

  return { balance: balance ?? storeBalance, loading };
}