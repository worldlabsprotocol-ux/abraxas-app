"use client";

import { useState } from "react";
import { mockVaults } from "@/lib/mockData";
import { VaultCard } from "@/components/VaultCard";
import { BagsTokenCard } from "@/components/BagsTokenCard";
import { systemStats } from "@/lib/mockData";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { BagsTokenLaunch } from "@/lib/bags";

const assetFilters = ["All", "Music & IP Royalties", "Real Estate", "Receivables"];
const statusFilters = ["All", "operating", "graduating"];

interface Props {
  bagsTokens: BagsTokenLaunch[];
}

export function MarketplaceClient({ bagsTokens }: Props) {
  const [assetFilter, setAssetFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showBags, setShowBags] = useState(true);

  const filteredVaults = mockVaults.filter((v) => {
    const assetMatch = assetFilter === "All" || v.assetClass === assetFilter;
    const statusMatch = statusFilter === "All" || v.status === statusFilter;
    return assetMatch && statusMatch;
  });

  const liveBags = bagsTokens.slice(0, 6);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-abraxas-subtle mb-2">
          Vault Marketplace
        </p>
        <h1 className="font-display font-bold text-2xl md:text-3xl mb-2">
          Operating vaults &amp; live tokens.
        </h1>
        <p className="text-sm text-abraxas-muted">
          Abraxas vaults paired with live Bags-launched tokens.
          Every vault has a named agent and a public action log.
        </p>
      </div>

      {/* System strip */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        {[
          { label: "Total AUM", value: formatCurrency(systemStats.totalAUM) },
          { label: "Actions Executed", value: formatNumber(systemStats.totalActions) },
          { label: "Unrecovered", value: "$0" },
        ].map((s) => (
          <div key={s.label} className="bg-bg-2 border border-border rounded-card p-4 text-center">
            <div className="font-display font-bold text-lg md:text-xl text-abraxas-text">{s.value}</div>
            <div className="text-[0.65rem] text-abraxas-subtle uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Live Bags tokens — only render if we got data back */}
      {liveBags.length > 0 && showBags && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-abraxas-green animate-pulse" />
              <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-abraxas-muted">
                Live on Bags
              </h2>
              <span className="text-[0.65rem] text-abraxas-subtle">
                · {liveBags.length} token{liveBags.length !== 1 ? "s" : ""}
              </span>
            </div>
            <button
              onClick={() => setShowBags(false)}
              className="text-[0.7rem] text-abraxas-subtle hover:text-gold uppercase tracking-wider"
            >
              Hide
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {liveBags.map((token) => (
              <BagsTokenCard key={token.tokenMint} token={token} />
            ))}
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <span className="text-[0.65rem] uppercase tracking-wider text-abraxas-subtle mr-2">
          Vaults:
        </span>
        {assetFilters.map((f) => (
          <button key={f} onClick={() => setAssetFilter(f)}
            className={`text-xs border rounded-md px-3.5 py-1.5 cursor-pointer transition-all ${
              assetFilter === f
                ? "border-gold text-gold bg-gold-dim"
                : "border-border text-abraxas-muted hover:border-border-2 bg-bg-3"
            }`}>
            {f}
          </button>
        ))}
        <div className="w-px bg-border h-6 mx-1" />
        {statusFilters.map((f) => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`text-xs border rounded-md px-3.5 py-1.5 cursor-pointer transition-all capitalize ${
              statusFilter === f
                ? "border-gold text-gold bg-gold-dim"
                : "border-border text-abraxas-muted hover:border-border-2 bg-bg-3"
            }`}>
            {f}
          </button>
        ))}
      </div>

      <p className="text-xs text-abraxas-subtle mb-4">
        {filteredVaults.length} vault{filteredVaults.length !== 1 ? "s" : ""}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVaults.map((vault) => (
          <VaultCard key={vault.id} vault={vault} />
        ))}
      </div>
    </div>
  );
}
