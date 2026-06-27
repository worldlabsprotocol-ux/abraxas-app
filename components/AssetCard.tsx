// FILE: components/AssetCard.tsx
// Production AssetCard — the universal card component for every asset type.
// Pokemon, One Piece, RWAs, luxury assets, NFTs — all go through this.
//
// LIGHT MODE PASS (June 2026)
// — Layout/props/exports unchanged. Re-themed to match the white-card,
//   soft-shadow marketplace cards seen in the reference screenshots.
// — Colors now read through var(--abx-*, fallback) tokens (see
//   styles/abraxas-theme-tokens.css). Drop that file in and this works in
//   both data-theme="light" and data-theme="dark" with zero further edits.
// — Badges that sit ON TOP of the artwork (rarity, grade, status pill) keep
//   the dark glass-chip treatment from the original — that pattern reads
//   fine over a photo regardless of page theme, same as every screenshot
//   reference (image badges stay dark-on-photo even on light pages).
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

// Deepened brand palette — same hues as the original, shifted so text/badges
// keep enough contrast sitting on white instead of glowing on near-black.
const STATUS_CONFIG: Record<AssetStatus, { label: string; bg: string; text: string; dot: string }> = {
  PROTECTED:        { label: "PROTECTED",  bg: "rgba(31,174,107,0.16)",  text: "#1FAE6B", dot: "#1FAE6B" },
  AT_RISK:          { label: "AT RISK",    bg: "rgba(224,82,79,0.18)",   text: "#E0524F", dot: "#E0524F" },
  CIRCUIT_TRIGGERED:{ label: "TRIGGERED",  bg: "rgba(224,82,79,0.22)",   text: "#E0524F", dot: "#E0524F" },
  UNPROTECTED:      { label: "UNPROTECTED",bg: "rgba(217,119,6,0.16)",   text: "#D97706", dot: "#D97706" },
  STAKED:           { label: "STAKED",     bg: "rgba(76,111,255,0.18)",  text: "#4C6FFF", dot: "#1FAE6B" },
};

// Card art — image if available, gradient + icon fallback
function CardArt({ asset, height = 140 }: { asset: Asset; height?: number }) {
  const [imgErr, setImgErr] = useState(false);
  const sc = STATUS_CONFIG[asset.status];

  const showImage = asset.image && !imgErr;

  return (
    <div style={{
      height, position: "relative", overflow: "hidden", borderRadius: "12px",
      // Lighter, airier placeholder gradient than the original (which was
      // tuned to glow on a near-black card background).
      background: showImage ? "transparent" : `linear-gradient(135deg, ${asset.color}1A, ${asset.color}06)`,
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
          <span style={{ fontSize: "3rem", filter: `drop-shadow(0 2px 8px ${asset.color}40)` }}>
            {asset.icon ?? "◈"}
          </span>
        </div>
      )}

      {/* Status badge — glass chip over the artwork, theme-independent */}
      <div style={{
        position: "absolute", top: "0.5rem", right: "0.5rem",
        display: "flex", alignItems: "center", gap: "0.25rem",
        padding: "0.15rem 0.45rem", borderRadius: "999px",
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
          background: "rgba(20,23,31,0.72)", backdropFilter: "blur(4px)",
          color: asset.rarity === "Legendary" ? "#FFD700" : asset.rarity === "Ultra Rare" ? "#D9B878" : "#7C9CFF",
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
          background: "rgba(20,23,31,0.72)", color: "#E8A93C", letterSpacing: "0.04em",
        }}>
          {asset.grade}
        </div>
      )}

      {/* Accrued ABRA for staked */}
      {asset.status === "STAKED" && asset.accrued !== undefined && (
        <div style={{
          position: "absolute", bottom: "0.5rem", left: "0.5rem",
          padding: "0.15rem 0.4rem", borderRadius: "3px", fontSize: "0.5rem", fontWeight: 700,
          background: "rgba(31,174,107,0.18)", color: "#1FAE6B", fontFamily: "'JetBrains Mono',monospace",
        }}>
          +{asset.accrued.toFixed(4)} $ABRA
        </div>
      )}
    </div>
  );
}

// Circuit defense mini-bar
function CircuitBar({ score }: { score: number; color: string }) {
  const c = score > 65 ? "#E0524F" : score > 40 ? "#D97706" : "#1FAE6B";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
        <span style={{ fontSize: "0.5rem", color: "var(--abx-text-tertiary, #9AA1AE)", letterSpacing: "0.06em" }}>CIRCUIT RISK</span>
        <span style={{ fontSize: "0.5rem", fontWeight: 700, color: c }}>{score}</span>
      </div>
      <div style={{ background: "var(--abx-border-subtle, #E7E9EE)", borderRadius: "3px", height: "3px" }}>
        <div style={{ width: `${score}%`, height: "100%", background: c, borderRadius: "3px", transition: "width 0.5s" }} />
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
          ? `linear-gradient(135deg, ${asset.color}14, ${asset.color}05)`
          : "var(--abx-bg-surface, #FFFFFF)",
        border: `1px solid ${selected ? asset.color + "55" : "var(--abx-border-subtle, #E7E9EE)"}`,
        borderRadius: "16px",
        overflow: "hidden",
        cursor: onSelect ? "pointer" : "default",
        boxShadow: selected
          ? `0 10px 24px ${asset.color}22`
          : "var(--abx-shadow-card, 0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06))",
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
        transform: selected ? "translateY(-2px)" : "translateY(0)",
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          (e.currentTarget as HTMLDivElement).style.borderColor = `${asset.color}55`;
          (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--abx-shadow-card-hover, 0 8px 20px rgba(16,24,40,0.10))";
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--abx-border-subtle, #E7E9EE)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--abx-shadow-card, 0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06))";
        }
      }}
    >
      <div style={{ padding: "0.625rem" }}>
        <CardArt asset={asset} height={compact ? 100 : 140} />

        <div style={{ marginTop: "0.625rem" }}>
          {/* Name + price */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.25rem" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 700, fontSize: "0.82rem", lineHeight: 1.25,
                color: "var(--abx-text-primary, #14171F)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{asset.name}</div>
              <div style={{ fontSize: "0.58rem", color: "var(--abx-text-tertiary, #9AA1AE)", marginTop: "1px" }}>{asset.type}</div>
            </div>
            {asset.priceSol !== undefined && (
              <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "0.5rem" }}>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--abx-text-primary, #14171F)" }}>{asset.priceSol.toFixed(1)}</div>
                <div style={{ fontSize: "0.5rem", color: "var(--abx-text-tertiary, #9AA1AE)" }}>SOL</div>
              </div>
            )}
          </div>

          {/* 24h change */}
          {asset.change24h !== undefined && (
            <div style={{ fontSize: "0.62rem", fontWeight: 600, color: positive ? "#1FAE6B" : "#E0524F", marginBottom: "0.375rem" }}>
              {positive ? "+" : ""}{asset.change24h.toFixed(1)}% 24h
            </div>
          )}

          {/* Circuit score */}
          {asset.circuitScore !== undefined && !compact && (
            <div style={{ marginBottom: "0.5rem" }}>
              <CircuitBar score={asset.circuitScore} color={asset.color} />
            </div>
          )}

          {/* Actions — primary action solid-filled (matches the "Invest" /
              "Buy Now" pill CTAs in the reference shots), secondary actions
              stay as tinted pills so three buttons don't compete visually. */}
          {!compact && (
            <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.4rem" }}>
              {onProtect && asset.status === "UNPROTECTED" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onProtect(asset); }}
                  style={{ flex: 1, background: "#1FAE6B", border: "1px solid #1FAE6B", borderRadius: "8px", padding: "0.35rem 0.4rem", fontSize: "0.62rem", fontWeight: 700, color: "#FFFFFF", cursor: "pointer" }}>
                  Protect
                </button>
              )}
              {onDuel && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDuel(asset); }}
                  style={{ flex: 1, background: "rgba(76,111,255,0.10)", border: "1px solid rgba(76,111,255,0.28)", borderRadius: "8px", padding: "0.35rem 0.4rem", fontSize: "0.62rem", fontWeight: 700, color: "#4C6FFF", cursor: "pointer" }}>
                  Duel
                </button>
              )}
              {onStake && (
                <button
                  onClick={(e) => { e.stopPropagation(); onStake(asset); }}
                  style={{
                    flex: 1,
                    background: asset.status === "STAKED" ? "rgba(224,82,79,0.08)" : "rgba(182,138,78,0.10)",
                    border: `1px solid ${asset.status === "STAKED" ? "rgba(224,82,79,0.3)" : "rgba(182,138,78,0.3)"}`,
                    borderRadius: "8px", padding: "0.35rem 0.4rem", fontSize: "0.62rem", fontWeight: 700,
                    color: asset.status === "STAKED" ? "#E0524F" : "#B68A4E", cursor: "pointer",
                  }}>
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
