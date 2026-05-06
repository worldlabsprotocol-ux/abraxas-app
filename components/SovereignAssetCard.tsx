// FILE: components/SovereignAssetCard.tsx
// High-density institutional asset card.
// Tabular numerics prevent layout shift on live updates.
// Inline SVG sparkline — zero dependencies.
// Jupiter swap placeholder in footer — swap @jup-ag/terminal in when ready.
// No emojis. SVG monoline icons only. JetBrains Mono for all data.
"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AssetStatus = "live" | "idle" | "alert" | "breached" | "loading";
export type AssetClass  = "metal" | "tcg" | "fleet" | "ondo" | "nft";

export interface PricePoint { t: number; v: number } // timestamp, value

export interface SovereignAsset {
  id:           string;
  name:         string;
  ticker:       string;
  assetClass:   AssetClass;
  // Pricing
  priceUsd:     number;
  change24h:    number;   // percent
  history:      PricePoint[]; // 20 points for sparkline
  // Collector Crypt vault metadata (TCG assets)
  vaultId?:     string;
  vaultLocation?: string;
  grade?:       string;
  // On-chain
  tokenId?:     string;
  // Fractional (fleet assets)
  fractionalPct?: number;  // 1-5%
  floorSol?:    number;
  // Circuit
  circuitScore: number;   // 0-100, maps to Vault.risk_level / 255 * 100
  defenseLevel: "armed" | "alert" | "breached" | "inactive";
  apy?:         number;
}

interface SovereignAssetCardProps {
  asset:        SovereignAsset;
  status?:      AssetStatus;
  onProtect?:   (id: string) => void;
  onSwap?:      (id: string) => void;
  onFraction?:  (id: string, pct: number) => void;
  compact?:     boolean;
}

// ─── SVG icon set (no emojis, no lucide dependency) ──────────────────────────
// Gold gradient def — referenced by icons
const GOLD_ID  = "gold-grad";
const SILV_ID  = "silv-grad";

function GoldBar({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id={GOLD_ID} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stopColor="#D4AF37"/>
          <stop offset="50%" stopColor="#F5E16A"/>
          <stop offset="100%"stopColor="#A8860A"/>
        </linearGradient>
      </defs>
      <path d="M4 12L8 7H26L28 10V22L26 25H4V12Z" fill="url(#gold-grad)" opacity="0.9"/>
      <path d="M8 7H26L28 10H10L8 7Z" fill="#F5E16A" opacity="0.6"/>
      <path d="M26 7L28 10V22L26 25V13L26 7Z" fill="#8B6914" opacity="0.5"/>
      <line x1="10" y1="13" x2="22" y2="13" stroke="#A8860A" strokeWidth="0.8" opacity="0.5"/>
      <line x1="10" y1="17" x2="22" y2="17" stroke="#A8860A" strokeWidth="0.8" opacity="0.35"/>
    </svg>
  );
}

function SilverBar({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id={SILV_ID} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stopColor="#C0C0C0"/>
          <stop offset="50%" stopColor="#E8E8E8"/>
          <stop offset="100%"stopColor="#808080"/>
        </linearGradient>
      </defs>
      <path d="M4 12L8 7H26L28 10V22L26 25H4V12Z" fill="url(#silv-grad)" opacity="0.9"/>
      <path d="M8 7H26L28 10H10L8 7Z" fill="#E8E8E8" opacity="0.6"/>
      <path d="M26 7L28 10V22L26 25V13L26 7Z" fill="#505050" opacity="0.5"/>
      <line x1="10" y1="13" x2="22" y2="13" stroke="#808080" strokeWidth="0.8" opacity="0.5"/>
      <line x1="10" y1="17" x2="22" y2="17" stroke="#808080" strokeWidth="0.8" opacity="0.35"/>
    </svg>
  );
}

function ShieldSVG({ level, size = 16 }: { level: SovereignAsset["defenseLevel"]; size?: number }) {
  const c = level === "armed" ? "#3dd68c" : level === "alert" ? "#FBBF24" : level === "breached" ? "#f26b6b" : "#333";
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 1L2 4v4c0 3.5 2.5 6.5 6 7.5C11.5 14.5 14 11.5 14 8V4L8 1Z"
        fill={`${c}22`} stroke={c} strokeWidth="1.2"/>
      {level === "armed" && <path d="M5.5 8l2 2 3-3" stroke={c} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>}
      {level === "alert" && <path d="M8 5v3M8 10v1" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>}
      {level === "breached" && <path d="M6 6l4 4M10 6l-4 4" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>}
    </svg>
  );
}

function JupIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#FF8500" strokeWidth="1.2"/>
      <path d="M5 10l3-4 3 4" stroke="#FF8500" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="8" cy="6" r="1.2" fill="#FF8500"/>
    </svg>
  );
}

// ─── Sparkline ─────────────────────────────────────────────────────────────────
// Dependency-free SVG sparkline. Renders 20-point price history.
function Sparkline({ data, positive, w = 80, h = 24 }: {
  data: PricePoint[]; positive: boolean; w?: number; h?: number;
}) {
  const pts = useMemo(() => {
    if (!data.length) return [];
    const vals = data.map(p => p.v);
    const min  = Math.min(...vals);
    const max  = Math.max(...vals);
    const rng  = max - min || 1;
    return vals.map((v, i) => ({
      x: (i / (vals.length - 1)) * w,
      y: h - ((v - min) / rng) * h * 0.85 - h * 0.075,
    }));
  }, [data, w, h]);

  if (!pts.length) return null;

  const d      = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const fill   = `${d}L${w},${h}L0,${h}Z`;
  const color  = positive ? "#3dd68c" : "#f26b6b";

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`sp-${positive}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#sp-${positive})`}/>
      <path d={d}    fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Pre-flight estimate ───────────────────────────────────────────────────────
function PreflightBar({ priceUsd, pct }: { priceUsd: number; pct: number }) {
  const cost = priceUsd * (pct / 100);
  const fee  = 0.000025; // estimated Solana fee in SOL
  return (
    <div style={{
      padding: "0.4rem 0.5rem", background: "rgba(255,133,0,0.06)",
      border: "1px solid rgba(255,133,0,0.18)", borderRadius: "5px",
      fontFamily: "'JetBrains Mono',monospace", fontSize: "0.52rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
        <span style={{ color: "rgba(255,255,255,0.4)" }}>Position ({pct}%)</span>
        <span style={{ color: "#f0f0f0", fontVariantNumeric: "tabular-nums" }}>
          ${cost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
        <span style={{ color: "rgba(255,255,255,0.4)" }}>Route</span>
        <span style={{ color: "#FF8500" }}>Jupiter v6 · USDT</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "rgba(255,255,255,0.4)" }}>Network fee</span>
        <span style={{ color: "rgba(255,255,255,0.5)", fontVariantNumeric: "tabular-nums" }}>
          {fee} SOL (est.)
        </span>
      </div>
    </div>
  );
}

// ─── Defense level badge ───────────────────────────────────────────────────────
const DEFENSE_LABEL: Record<SovereignAsset["defenseLevel"], string> = {
  armed:    "ARMED",
  alert:    "ALERT",
  breached: "BREACHED",
  inactive: "INACTIVE",
};
const DEFENSE_COLOR: Record<SovereignAsset["defenseLevel"], string> = {
  armed:    "#3dd68c",
  alert:    "#FBBF24",
  breached: "#f26b6b",
  inactive: "#333",
};

// ─── Main component ────────────────────────────────────────────────────────────
export function SovereignAssetCard({
  asset, status = "live", onProtect, onSwap, onFraction, compact = false,
}: SovereignAssetCardProps) {
  const [preflight, setPreflight]       = useState(false);
  const [fracPct, setFracPct]           = useState(asset.fractionalPct ?? 1);
  const [imgErr, setImgErr]             = useState(false);
  const positive    = asset.change24h >= 0;
  const dc          = DEFENSE_COLOR[asset.defenseLevel];
  const riskPct     = Math.round(asset.circuitScore);
  const riskColor   = riskPct > 65 ? "#f26b6b" : riskPct > 35 ? "#FBBF24" : "#3dd68c";

  const fmtUsd = (v: number) =>
    "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtPct = (v: number) =>
    (v >= 0 ? "+" : "") + v.toFixed(2) + "%";

  return (
    <div style={{
      background:   "rgba(6,8,16,0.97)",
      border:       `1px solid ${dc}22`,
      borderRadius: "12px",
      overflow:     "hidden",
      position:     "relative",
      fontFamily:   "'JetBrains Mono', monospace",
      transition:   "border-color 0.2s",
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = `${dc}55`)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = `${dc}22`)}
    >
      {/* Live status strip */}
      <div style={{
        height: "2px",
        background: status === "live"    ? "linear-gradient(90deg, #3dd68c, #6b8cff)" :
                    status === "alert"   ? "#FBBF24" :
                    status === "breached"? "#f26b6b" : "#333",
        animation: status === "live" ? "none" : undefined,
      }} />

      <div style={{ padding: compact ? "0.625rem" : "0.875rem" }}>

        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {/* Asset icon */}
            <div style={{ flexShrink: 0 }}>
              {asset.assetClass === "metal" && asset.ticker === "XAU" && <GoldBar size={24} />}
              {asset.assetClass === "metal" && asset.ticker === "XAG" && <SilverBar size={24} />}
              {(asset.assetClass === "tcg" || asset.assetClass === "fleet" || asset.assetClass === "ondo" || asset.assetClass === "nft") && (
                <ShieldSVG level={asset.defenseLevel} size={22} />
              )}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.78rem", color: "#f0f0f0", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                {asset.name}
              </div>
              <div style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", marginTop: "1px" }}>
                {asset.ticker} · {asset.grade ?? asset.assetClass.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Defense badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <span style={{
              width: "5px", height: "5px", borderRadius: "50%", background: dc,
              animation: asset.defenseLevel !== "inactive" ? "pulse 2s ease-in-out infinite" : "none",
              flexShrink: 0,
            }} />
            <span style={{ fontSize: "0.46rem", fontWeight: 700, color: dc, letterSpacing: "0.1em" }}>
              {DEFENSE_LABEL[asset.defenseLevel]}
            </span>
          </div>
        </div>

        {/* Price block — tabular numerics prevent jitter */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "0.5rem" }}>
          <div>
            <div style={{
              fontSize: compact ? "1rem" : "1.2rem",
              fontWeight: 800, color: "#f0f0f0", letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}>
              {fmtUsd(asset.priceUsd)}
            </div>
            <div style={{
              fontSize: "0.6rem", fontWeight: 700, color: positive ? "#3dd68c" : "#f26b6b",
              fontVariantNumeric: "tabular-nums", marginTop: "1px",
            }}>
              {fmtPct(asset.change24h)} 24H
            </div>
          </div>

          {/* Sparkline */}
          {!compact && asset.history.length > 1 && (
            <Sparkline data={asset.history} positive={positive} />
          )}
        </div>

        {/* Vault metadata (TCG only) */}
        {asset.vaultId && !compact && (
          <div style={{
            padding: "0.35rem 0.5rem", background: "rgba(255,255,255,0.03)",
            borderRadius: "5px", marginBottom: "0.5rem",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.2rem 0.5rem", fontSize: "0.5rem" }}>
              <span style={{ color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Vault ID</span>
              <span style={{ color: "rgba(255,255,255,0.6)", fontVariantNumeric: "tabular-nums" }}>{asset.vaultId}</span>
              {asset.vaultLocation && <>
                <span style={{ color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Location</span>
                <span style={{ color: "rgba(255,255,255,0.6)" }}>{asset.vaultLocation}</span>
              </>}
              {asset.tokenId && <>
                <span style={{ color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>On-Chain</span>
                <span style={{ color: "#6b8cff" }}>{asset.tokenId.slice(0, 16)}…</span>
              </>}
            </div>
          </div>
        )}

        {/* Circuit risk bar */}
        {!compact && (
          <div style={{ marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.48rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "3px" }}>
              <span>Circuit Risk</span>
              <span style={{ color: riskColor, fontVariantNumeric: "tabular-nums" }}>{riskPct}/100</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "2px", height: "2px" }}>
              <div style={{
                width: `${riskPct}%`, height: "100%", borderRadius: "2px",
                background: `linear-gradient(90deg, ${riskColor}88, ${riskColor})`,
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>
        )}

        {/* APY (yield assets) */}
        {asset.apy !== undefined && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.52rem", marginBottom: "0.5rem" }}>
            <span style={{ color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em" }}>APY</span>
            <span style={{ color: "#3dd68c", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {asset.apy.toFixed(2)}%
            </span>
          </div>
        )}

        {/* Fractional selector (fleet assets) */}
        {asset.fractionalPct !== undefined && !compact && (
          <div style={{ marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.5rem", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
              <span>Fractional Share</span>
              <span style={{ color: "#D4AF37", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>{fracPct}%</span>
            </div>
            <input type="range" min={1} max={5} step={1} value={fracPct}
              onChange={e => setFracPct(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#D4AF37", height: "3px", cursor: "pointer" }}
            />
          </div>
        )}

        {/* Pre-flight estimate */}
        {preflight && <div style={{ marginBottom: "0.5rem" }}><PreflightBar priceUsd={asset.priceUsd} pct={fracPct} /></div>}

        {/* Action row */}
        {!compact && (
          <div style={{ display: "flex", gap: "0.3rem" }}>
            {onProtect && (
              <button onClick={() => onProtect(asset.id)} style={{
                flex: 1, padding: "0.35rem 0.3rem", borderRadius: "6px",
                fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.04em",
                background: "rgba(61,214,140,0.1)", border: "1px solid rgba(61,214,140,0.25)",
                color: "#3dd68c", cursor: "pointer", fontFamily: "inherit",
              }}>
                Protect
              </button>
            )}
            {/* Jupiter swap button */}
            <button
              onClick={() => { setPreflight(p => !p); onSwap?.(asset.id); }}
              style={{
                flex: 2, padding: "0.35rem 0.5rem", borderRadius: "6px",
                fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.04em",
                background: "rgba(255,133,0,0.12)", border: "1px solid rgba(255,133,0,0.3)",
                color: "#FF8500", cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem",
              }}>
              <JupIcon size={11} />
              {asset.fractionalPct !== undefined ? `Secure ${fracPct}% · Jupiter` : "Swap · Jupiter"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────
export function SovereignAssetCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{
      background: "rgba(6,8,16,0.97)", border: "1px solid rgba(255,255,255,0.04)",
      borderRadius: "12px", overflow: "hidden", height: compact ? 110 : 280,
      animation: "pulse 1.5s ease-in-out infinite",
    }}>
      <div style={{ height: "2px", background: "rgba(255,255,255,0.06)" }} />
      <div style={{ padding: "0.875rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <div>
            <div style={{ width: 100, height: "0.75rem", background: "rgba(255,255,255,0.06)", borderRadius: "3px", marginBottom: "4px" }} />
            <div style={{ width: 60,  height: "0.5rem",  background: "rgba(255,255,255,0.04)", borderRadius: "3px" }} />
          </div>
        </div>
        <div style={{ width: 120, height: "1.2rem", background: "rgba(255,255,255,0.08)", borderRadius: "4px", marginBottom: "0.5rem" }} />
        <div style={{ width: "100%", height: "2px", background: "rgba(255,255,255,0.06)", borderRadius: "2px" }} />
      </div>
    </div>
  );
}