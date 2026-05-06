// FILE: components/AssetCard.tsx
// Production AssetCard — the universal card component for every asset type.
// Pokemon, One Piece, RWAs, luxury assets, NFTs — all go through this.
// Uses tailwind classNames (now wired via globals.css) + CSS vars.
// No framer-motion — CSS transitions only. Renders fast on mobile.
"use client";

import { useState } from "react";

export type AssetStatus = "PROTECTED" | "AT_RISK" | "CIRCUIT_TRIGGERED" | "UNPROTECTED" | "STAKED";
export type AssetType   = "pokemon" | "onepiece" | "luxury" | "nft" | "rwa";

export interface Asset {
  id:           string;
  name:         string;
  type:         AssetType;
  image?:       string;   // URL or undefined → renders SVG placeholder
  icon?:        string;   // emoji fallback
  grade?:       string;
  rarity?:      string;
  priceSol?:    number;
  priceUsd?:    number;
  change24h?:   number;
  power?:       number;
  defense?:     number;
  circuitScore?: number;
  status:       AssetStatus;
  stakeApy?:    number;
  color:        string;
  accrued?:     number;   // ABRA accrued if staked
}

interface AssetCardProps {
  asset:     Asset;
  onSelect?: (asset: Asset) => void;
  onProtect?:(asset: Asset) => void;
  onDuel?:   (asset: Asset) => void;
  onStake?:  (asset: Asset) => void;
  selected?: boolean;
  compact?:  boolean;
}

const STATUS_CONFIG: Record<AssetStatus, { label: string; bg: string; text: string; dot: string }> = {
  PROTECTED:        { label: "PROTECTED",        bg: "rgba(61,214,140,0.15)",   text: "#3dd68c", dot: "#3dd68c" },
  AT_RISK:          { label: "AT RISK",           bg: "rgba(242,107,107,0.15)", text: "#f26b6b", dot: "#f26b6b" },
  CIRCUIT_TRIGGERED:{ label: "TRIGGERED",         bg: "rgba(242,107,107,0.2)",  text: "#f26b6b", dot: "#f26b6b" },
  UNPROTECTED:      { label: "UNPROTECTED",       bg: "rgba(251,191,36,0.12)",  text: "#FBBF24", dot: "#FBBF24" },
  STAKED:           { label: "STAKED",            bg: "rgba(107,140,255,0.15)", text: "#6b8cff", dot: "#3dd68c" },
};

// Card art — image if available, gradient + icon fallback
function CardArt({ asset, height = 140 }: { asset: Asset; height?: number }) {
  const [imgErr, setImgErr] = useState(false);
  const sc = STATUS_CONFIG[asset.status];

  const showImage = asset.image && !imgErr;

  return (
    <div style={{
      height, position: "relative", overflow: "hidden", borderRadius: "10px",
      background: showImage ? "transparent" : `linear-gradient(135deg, ${asset.color}28, ${asset.color}08)`,
    }}>
      {showImage ? (
        <img
          src={asset.image}
          alt={asset.name}
          onError={() => setImgErr(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <span style={{ fontSize: "3rem", filter: `drop-shadow(0 0 10px ${asset.color}88)` }}>
            {asset.icon ?? "◈"}
          </span>
        </div>
      )}

      {/* Status badge */}
      <div style={{
        position: "absolute", top: "0.5rem", right: "0.5rem",
        display: "flex", alignItems: "center", gap: "0.25rem",
        padding: "0.15rem 0.45rem", borderRadius: "4px",
        background: sc.bg, backdropFilter: "blur(8px)",
      }}>
        <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: sc.dot,
          animation: asset.status !== "UNPROTECTED" ? "pulse 1.5s ease-in-out infinite" : "none" }} />
        <span style={{ fontSize: "0.5rem", fontWeight: 800, color: sc.text, letterSpacing: "0.08em" }}>
          {sc.label}
        </span>
      </div>

      {/* Rarity badge */}
      {asset.rarity && (
        <div style={{
          position: "absolute", top: "0.5rem", left: "0.5rem",
          padding: "0.12rem 0.4rem", borderRadius: "4px", fontSize: "0.48rem", fontWeight: 700,
          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
          color: asset.rarity === "Legendary" ? "#FFD700" : asset.rarity === "Ultra Rare" ? "#C8A96E" : "#60A5FA",
          letterSpacing: "0.06em",
        }}>
          {asset.rarity.toUpperCase()}
        </div>
      )}

      {/* Grade */}
      {asset.grade && (
        <div style={{
          position: "absolute", bottom: "0.5rem", right: "0.5rem",
          padding: "0.12rem 0.4rem", borderRadius: "3px", fontSize: "0.48rem", fontWeight: 700,
          background: "rgba(0,0,0,0.65)", color: "#FBBF24", letterSpacing: "0.04em",
        }}>
          {asset.grade}
        </div>
      )}

      {/* Accrued ABRA for staked */}
      {asset.status === "STAKED" && asset.accrued !== undefined && (
        <div style={{
          position: "absolute", bottom: "0.5rem", left: "0.5rem",
          padding: "0.15rem 0.4rem", borderRadius: "3px", fontSize: "0.5rem", fontWeight: 700,
          background: "rgba(61,214,140,0.15)", color: "#3dd68c", fontFamily: "'JetBrains Mono',monospace",
        }}>
          +{asset.accrued.toFixed(4)} $ABRA
        </div>
      )}
    </div>
  );
}

// Circuit defense mini-bar
function CircuitBar({ score, color }: { score: number; color: string }) {
  const c = score > 65 ? "#f26b6b" : score > 40 ? "#FBBF24" : "#3dd68c";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
        <span style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>CIRCUIT RISK</span>
        <span style={{ fontSize: "0.5rem", fontWeight: 700, color: c }}>{score}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "2px", height: "2px" }}>
        <div style={{ width: `${score}%`, height: "100%", background: c, borderRadius: "2px", transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

export function AssetCard({ asset, onSelect, onProtect, onDuel, onStake, selected, compact }: AssetCardProps) {
  const positive = (asset.change24h ?? 0) >= 0;

  return (
    <div
      onClick={() => onSelect?.(asset)}
      style={{
        background: selected
          ? `linear-gradient(135deg, ${asset.color}18, ${asset.color}06)`
          : "rgba(13,18,32,0.95)",
        border: `1px solid ${selected ? asset.color + "66" : asset.color + "20"}`,
        borderRadius: "14px",
        overflow: "hidden",
        cursor: onSelect ? "pointer" : "default",
        boxShadow: selected ? `0 0 24px ${asset.color}18` : "none",
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
        transform: selected ? "translateY(-2px)" : "translateY(0)",
      }}
      onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLDivElement).style.borderColor = `${asset.color}40`; }}
      onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLDivElement).style.borderColor = `${asset.color}20`; }}
    >
      <div style={{ padding: "0.625rem" }}>
        <CardArt asset={asset} height={compact ? 100 : 140} />

        <div style={{ marginTop: "0.625rem" }}>
          {/* Name + price */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: "0.82rem", lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{asset.name}</div>
              <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.35)", marginTop: "1px" }}>{asset.type}</div>
            </div>
            {asset.priceSol !== undefined && (
              <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "0.5rem" }}>
                <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{asset.priceSol.toFixed(1)}</div>
                <div style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.3)" }}>SOL</div>
              </div>
            )}
          </div>

          {/* 24h change */}
          {asset.change24h !== undefined && (
            <div style={{ fontSize: "0.62rem", fontWeight: 600, color: positive ? "#3dd68c" : "#f26b6b", marginBottom: "0.375rem" }}>
              {positive ? "+" : ""}{asset.change24h.toFixed(1)}% 24h
            </div>
          )}

          {/* Circuit score */}
          {asset.circuitScore !== undefined && !compact && (
            <div style={{ marginBottom: "0.5rem" }}>
              <CircuitBar score={asset.circuitScore} color={asset.color} />
            </div>
          )}

          {/* Actions */}
          {!compact && (
            <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.4rem" }}>
              {onProtect && asset.status === "UNPROTECTED" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onProtect(asset); }}
                  style={{ flex: 1, background: "rgba(61,214,140,0.12)", border: "1px solid rgba(61,214,140,0.25)", borderRadius: "7px", padding: "0.35rem 0.4rem", fontSize: "0.62rem", fontWeight: 700, color: "#3dd68c", cursor: "pointer" }}>
                  Protect
                </button>
              )}
              {onDuel && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDuel(asset); }}
                  style={{ flex: 1, background: "rgba(107,140,255,0.12)", border: "1px solid rgba(107,140,255,0.25)", borderRadius: "7px", padding: "0.35rem 0.4rem", fontSize: "0.62rem", fontWeight: 700, color: "#6b8cff", cursor: "pointer" }}>
                  Duel
                </button>
              )}
              {onStake && (
                <button
                  onClick={(e) => { e.stopPropagation(); onStake(asset); }}
                  style={{ flex: 1, background: asset.status === "STAKED" ? "rgba(242,107,107,0.1)" : "rgba(200,169,110,0.12)", border: `1px solid ${asset.status === "STAKED" ? "rgba(242,107,107,0.25)" : "rgba(200,169,110,0.25)"}`, borderRadius: "7px", padding: "0.35rem 0.4rem", fontSize: "0.62rem", fontWeight: 700, color: asset.status === "STAKED" ? "#f26b6b" : "#c8a96e", cursor: "pointer" }}>
                  {asset.status === "STAKED" ? "Unstake" : `${asset.stakeApy ?? 10}%`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}