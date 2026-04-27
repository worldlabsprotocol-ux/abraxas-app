"use client";

import type { BagsTokenLaunch } from "@/lib/bags";

const statusStyles: Record<string, string> = {
  LIVE: "bg-[rgba(74,222,128,0.12)] text-green-400",
  PRE_LAUNCH: "bg-[rgba(251,191,36,0.12)] text-yellow-400",
  GRADUATED: "bg-[rgba(200,169,110,0.12)] text-gold",
};

/**
 * Card for a real Bags-launched token. Used in the marketplace
 * to show live tokens alongside Abraxas vaults.
 */
export function BagsTokenCard({ token }: { token: BagsTokenLaunch }) {
  const statusClass =
    statusStyles[token.status] ??
    "bg-bg-3 text-abraxas-subtle";

  const tokenUrl = `https://bags.fm/${token.symbol ? `${token.symbol}` : ""}`;
  const solscanUrl = `https://solscan.io/token/${token.tokenMint}`;

  return (
    <a
      href={tokenUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-bg-2 border border-border rounded-card p-6 hover:border-border-2 transition-colors group"
    >
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {token.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={token.image}
              alt={token.name}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-border"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gold-dim flex items-center justify-center text-base font-display font-bold text-gold flex-shrink-0">
              {token.symbol?.[0] ?? "·"}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-display font-bold text-base text-abraxas-text group-hover:text-gold transition-colors truncate">
              {token.name || token.symbol}
            </div>
            <div className="text-xs text-abraxas-subtle truncate">
              ${token.symbol}
            </div>
          </div>
        </div>
        <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${statusClass} flex-shrink-0`}>
          {token.status?.replace(/_/g, " ") ?? "live"}
        </span>
      </div>

      {token.description && (
        <p className="text-xs text-abraxas-muted leading-relaxed mb-4 line-clamp-2">
          {token.description}
        </p>
      )}

      <div className="space-y-1.5 text-xs mb-4">
        <div className="flex justify-between">
          <span className="text-abraxas-subtle">Source</span>
          <span className="text-gold">Bags</span>
        </div>
        <div className="flex justify-between">
          <span className="text-abraxas-subtle">Mint</span>
          <span className="font-mono text-abraxas-muted truncate max-w-[140px]">
            {token.tokenMint?.slice(0, 4)}…{token.tokenMint?.slice(-4)}
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-border flex items-center justify-between">
        <span
          className="text-[0.7rem] text-abraxas-subtle hover:text-gold"
          onClick={(e) => {
            e.preventDefault();
            window.open(solscanUrl, "_blank");
          }}
        >
          Solscan ↗
        </span>
        <span className="text-[0.7rem] font-display font-semibold text-gold">
          View on Bags →
        </span>
      </div>
    </a>
  );
}
