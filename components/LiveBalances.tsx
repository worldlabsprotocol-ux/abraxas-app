"use client";

import { useWalletBalances } from "@/lib/useWalletBalances";
import { useAuth } from "@/lib/authState";
import { ABRA } from "@/lib/constants";

function fmt(n: number | null, dp = 4): string {
  if (n === null) return "-";
  if (n === 0) return "0";
  if (n < 0.0001) return n.toExponential(2);
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: dp });
}

export function LiveBalances() {
  const { walletConnected } = useAuth();
  const { sol, abra, loading, error, refresh } = useWalletBalances();

  if (!walletConnected) {
    return (
      <div className="bg-bg-2 border border-border rounded-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-abraxas-subtle" />
          <span className="font-display font-semibold text-sm">Live Balances</span>
        </div>
        <p className="text-xs text-abraxas-subtle">Connect wallet to view balances.</p>
      </div>
    );
  }

  return (
    <div className="bg-bg-2 border border-border rounded-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${loading ? "bg-abraxas-subtle animate-pulse" : error ? "bg-abraxas-red" : "bg-abraxas-green"}`} />
          <span className="font-display font-semibold text-sm">Live Balances</span>
        </div>
        <button onClick={refresh} className="text-[0.65rem] text-abraxas-subtle hover:text-gold uppercase tracking-wider">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[0.65rem] text-abraxas-subtle uppercase tracking-wider mb-1">SOL</div>
          <div className="font-display font-bold text-xl">
            {loading ? <span className="text-abraxas-subtle">…</span> : fmt(sol)}
          </div>
          <div className="text-[0.7rem] text-abraxas-subtle mt-0.5">Solana</div>
        </div>
        <div>
          <div className="text-[0.65rem] text-abraxas-subtle uppercase tracking-wider mb-1">$ABRA</div>
          <div className="font-display font-bold text-xl text-gold">
            {loading ? <span className="text-abraxas-subtle">…</span> : fmt(abra)}
          </div>
          <div className="text-[0.7rem] text-abraxas-subtle mt-0.5">
            <a href={ABRA.solscan} target="_blank" rel="noopener noreferrer" className="hover:text-gold font-mono">
              {ABRA.caShort}
            </a>
          </div>
        </div>
      </div>

      {error && <p className="text-[0.7rem] text-abraxas-red mt-3">{error}</p>}
    </div>
  );
}
