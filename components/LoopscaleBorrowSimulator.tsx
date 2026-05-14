"use client";

import { useState, useMemo } from "react";
import { useAbraStore } from "@/lib/abraxasStore";
import { useRealtimeMarkets } from "@/lib/hooks/useRealtimeMarkets";

interface InvAsset {
  id: string;
  name: string;
  category: string;
  priceUsd: number;
  ticker: string;
  imagePath?: string | null;
  ltv?: number;
  change24h?: number;
  borrow_max_usd?: number;
}

const CAT_COLOR: Record<string, string> = {
  Pokemon: "#FBBF24",
  "One Piece": "#f26b6b",
  Comics: "#a855f7",
  Metals: "#D4AF37",
  Stocks: "#14F195",
  Watches: "#6b8cff",
  Sports: "#fb923c",
  Spirits: "#FF8C00",
  Racehorses: "#22c55e",
};

const CAT_PARTNER: Record<string, string> = {
  Spirits: "Baxus",
  Watches: "Courtyard",
  Comics: "Metropolis",
  Pokemon: "Collector Crypt",
  "One Piece": "Collector Crypt",
  Sports: "Collector Crypt",
  Metals: "LBMA",
  Stocks: "Digital Custody",
  Racehorses: "The Jockey Club",
};

const CAT_LTV: Record<string, number> = {
  Metals: 80,
  Stocks: 70,
  Watches: 65,
  Comics: 65,
  Spirits: 55,
  Racehorses: 55,
  Sports: 55,
  Pokemon: 55,
  "One Piece": 55,
};

function fmtUsd(v: number): string {
  if (v >= 1_000_000) return `\[ {(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return ` \]{(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function AssetCard({ asset, isNew = false }: { asset: InvAsset; isNew?: boolean }) {
  const [hov, setHov] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const c = CAT_COLOR[asset.category] ?? "#C8A96E";
  const ltv = asset.ltv ?? CAT_LTV[asset.category] ?? 55;
  const borrow = asset.borrow_max_usd ?? Math.round(asset.priceUsd * ltv / 100);
  const chg = asset.change24h ?? 1.8;
  const isUp = chg >= 0;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: `linear-gradient(145deg,${c}07,rgba(6,8,16,0.99))`,
        border: `1px solid ${hov ? c + "55" : c + "22"}`,
        borderRadius: "12px",
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.18s",
        transform: hov ? "translateY(-2px) scale(1.004)" : "none",
        boxShadow: hov ? `0 0 24px ${c}18` : "none",
      }}
    >
      {isNew && (
        <div
          style={{
            position: "absolute",
            top: "0.35rem",
            right: "0.35rem",
            zIndex: 10,
            padding: "0.06rem 0.3rem",
            borderRadius: "4px",
            background: "rgba(20,241,149,0.15)",
            border: "1px solid rgba(20,241,149,0.35)",
            fontSize: "0.36rem",
            fontWeight: 800,
            color: "#14F195",
            fontFamily: "'JetBrains Mono',monospace",
          }}
        >
          NEW
        </div>
      )}

      <div style={{ height: "2px", background: `linear-gradient(90deg,\( {c}90, \){c}15)` }} />

      <div
        style={{
          height: "120px",
          background: "rgba(6,8,16,0.98)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.35rem",
          overflow: "hidden",
        }}
      >
        {asset.imagePath && !imgErr ? (
          <img
            src={asset.imagePath}
            alt={asset.name}
            onError={() => setImgErr(true)}
            style={{ maxHeight: "112px", maxWidth: "100%", objectFit: "contain", borderRadius: "4px" }}
            loading="lazy"
          />
        ) : (
          <div style={{ color: c, fontSize: "3.5rem", opacity: 0.12 }}>◈</div>
        )}
      </div>

      <div style={{ padding: "0.55rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.2rem", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "0.4rem",
              fontWeight: 800,
              padding: "0.05rem 0.28rem",
              borderRadius: "8px",
              background: `${c}14`,
              border: `1px solid ${c}30`,
              color: c,
              fontFamily: "'JetBrains Mono',monospace",
              textTransform: "uppercase",
            }}
          >
            {asset.category}
          </span>
          <span style={{ marginLeft: "auto", fontSize: "0.36rem", color: "#14F195", fontFamily: "'JetBrains Mono',monospace" }}>
            ✓ VERIFIED
          </span>
        </div>

        <div style={{ fontWeight: 800, fontSize: "0.66rem", color: "#f0f0f0", marginBottom: "2px" }}>{asset.name}</div>
        <div style={{ fontSize: "0.38rem", color: "rgba(255,255,255,0.3)", marginBottom: "0.5rem" }}>
          {CAT_PARTNER[asset.category] ?? "Verified Custodian"}
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.4rem", marginBottom: "0.4rem" }}>
          <span style={{ fontWeight: 900, fontSize: "0.85rem", color: "#f0f0f0", fontFamily: "'JetBrains Mono',monospace" }}>
            {fmtUsd(asset.priceUsd)}
          </span>
          <span style={{ fontSize: "0.48rem", color: isUp ? "#14F195" : "#f26b6b", fontFamily: "'JetBrains Mono',monospace" }}>
            {isUp ? "+" : ""}
            {chg.toFixed(1)}%
          </span>
        </div>

        <div style={{ fontSize: "0.42rem", color: "rgba(20,241,149,0.6)", marginBottom: "0.5rem" }}>
          Borrow {fmtUsd(borrow)} USDC · {ltv}% LTV
        </div>

        <a
          href="/protect"
          style={{
            display: "block",
            padding: "0.28rem 0",
            borderRadius: "5px",
            background: `${c}10`,
            border: `1px solid ${c}22`,
            color: c,
            fontSize: "0.44rem",
            fontWeight: 700,
            fontFamily: "'JetBrains Mono',monospace",
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          Collateralize →
        </a>
      </div>
    </div>
  );
}

export function MarketsLayer() {
  const { assets: dbAssets, loading } = useRealtimeMarkets();
  const storeListedAssets = useAbraStore((s) => s.getListedAssets());

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const allAssets = useMemo(() => {
    const knownIds = new Set(dbAssets.map((a) => a.id));

    return [
      ...dbAssets.map((a) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        priceUsd: a.price_usd,
        ticker: a.token_id ?? "",
        ltv: a.ltv,
        imagePath: a.image_url ?? null,
        borrow_max_usd: a.borrow_max_usd,
        change24h: 0,
      })),
      ...storeListedAssets
        .filter((a) => !knownIds.has(a.id))
        .map((a) => ({
          id: a.id,
          name: a.name,
          category: a.assetClass || "Other",
          priceUsd: a.estimatedUsd,
          ticker: a.tokenId ?? "",
          ltv: a.ltv,
          imagePath: a.imagePreview ?? null,
          borrow_max_usd: Math.round(a.estimatedUsd * (a.ltv ?? 55) / 100),
          change24h: 0,
        })),
    ];
  }, [dbAssets, storeListedAssets]);

  const shown = useMemo(() => {
    return allAssets
      .filter((a) => filter === "all" || a.category === filter)
      .filter((a) => !search || a.name.toLowerCase().includes(search.toLowerCase()));
  }, [allAssets, filter, search]);

  if (loading && allAssets.length === 0) {
    return <div className="p-12 text-center text-gray-400">Loading markets...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-xl font-bold text-emerald-400">{allAssets.length}</div>
          <div className="text-xs text-gray-500">LISTED ASSETS</div>
        </div>
        <div>
          <div className="text-xl font-bold text-amber-400">{storeListedAssets.length}</div>
          <div className="text-xs text-gray-500">PENDING</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {shown.length > 0 ? (
          shown.map((asset) => <AssetCard key={asset.id} asset={asset} isNew={true} />)
        ) : (
          <div className="col-span-full p-12 text-center text-gray-400">
            No assets available yet. New minted assets will appear here.
          </div>
        )}
      </div>
    </div>
  );
}
