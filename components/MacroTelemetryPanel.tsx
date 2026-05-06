// FILE: components/MacroTelemetryPanel.tsx
// Sovereign Macro Telemetry — absorbs DeFiLlama, no external links.
// Radial gauge (SVG) + stablecoin flow bars + sector heatmap.
// All data from /api/macro. JetBrains Mono, tabular numerics, no emojis.
// [REESTABLISHING SECURE HANDSHAKE] when API drops.
"use client";

import { useState, useEffect, useRef, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MacroData {
  solana: { tvl: number; tvlFormatted: string; change24h: number };
  stablecoins: Array<{ symbol: string; circulating: number; circulatingFormatted: string; change24h: number }>;
  source: "defillama_live" | "deterministic_oracle";
  updatedAt: string;
}

type StreamStatus = "live" | "idle" | "reconnecting" | "error";

// ─── SVG Radial Gauge ─────────────────────────────────────────────────────────
// Renders an SVG arc gauge — no dependencies.
function RadialGauge({ value, max, label, color, size = 96 }: {
  value: number; max: number; label: string; color: string; size?: number;
}) {
  const cx      = size / 2;
  const cy      = size / 2;
  const r       = size * 0.38;
  const circ    = 2 * Math.PI * r;
  const sweep   = (Math.min(value, max) / max) * 0.75; // 75% of circle
  const offset  = circ * (1 - sweep);
  const startAng = 135;  // start at bottom-left

  // SVG arc path
  const polarX = (ang: number) => cx + r * Math.cos((ang * Math.PI) / 180);
  const polarY = (ang: number) => cy + r * Math.sin((ang * Math.PI) / 180);

  const ang1 = startAng;
  const ang2 = startAng + sweep * 360;
  const large = sweep > 0.5 ? 1 : 0;

  const arcPath = [
    `M ${polarX(ang1).toFixed(2)} ${polarY(ang1).toFixed(2)}`,
    `A ${r} ${r} 0 ${large} 1 ${polarX(ang2).toFixed(2)} ${polarY(ang2).toFixed(2)}`,
  ].join(" ");

  const trackPath = [
    `M ${polarX(ang1).toFixed(2)} ${polarY(ang1).toFixed(2)}`,
    `A ${r} ${r} 0 1 1 ${polarX(startAng + 0.75 * 360).toFixed(2)} ${polarY(startAng + 0.75 * 360).toFixed(2)}`,
  ].join(" ");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Glow filter */}
        <defs>
          <filter id={`glow-${label}`}>
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {/* Track */}
        <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" strokeLinecap="round"/>
        {/* Value arc */}
        <path d={arcPath} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          filter={`url(#glow-${label})`} />
        {/* Center text */}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#f0f0f0" fontSize="10" fontWeight="800"
          fontFamily="'JetBrains Mono',monospace" style={{ fontVariantNumeric: "tabular-nums" }}>
          {value >= 1e9 ? `$${(value / 1e9).toFixed(1)}B` : value >= 1e6 ? `$${(value / 1e6).toFixed(0)}M` : String(value)}
        </text>
        <text x={cx} y={cy + 9} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="6"
          fontFamily="'JetBrains Mono',monospace" letterSpacing="1">
          {label}
        </text>
      </svg>
    </div>
  );
}

// ─── Stablecoin flow bar ───────────────────────────────────────────────────────
function FlowBar({ symbol, value, max, change, color }: {
  symbol: string; value: number; max: number; change: number; color: string;
}) {
  const pct      = Math.min(100, (value / max) * 100);
  const positive = change >= 0;
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "3px" }}>
        <span style={{ fontSize: "0.56rem", fontWeight: 700, color: "#f0f0f0", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.04em" }}>
          {symbol}
        </span>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.45)", fontVariantNumeric: "tabular-nums" }}>
            {value >= 1e9 ? `$${(value / 1e9).toFixed(2)}B` : `$${(value / 1e6).toFixed(0)}M`}
          </span>
          <span style={{ fontSize: "0.52rem", fontWeight: 700, color: positive ? "#3dd68c" : "#f26b6b", fontVariantNumeric: "tabular-nums" }}>
            {positive ? "+" : ""}{change.toFixed(2)}%
          </span>
        </div>
      </div>
      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "2px", height: "3px", overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: "2px", transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

// ─── Sector heatmap cell ───────────────────────────────────────────────────────
interface HeatCell { label: string; value: string; pct: number; trend: "up" | "dn" | "flat" }

function HeatCell({ cell }: { cell: HeatCell }) {
  const c = cell.trend === "up" ? "#3dd68c" : cell.trend === "dn" ? "#f26b6b" : "#FBBF24";
  return (
    <div style={{
      padding: "0.4rem 0.5rem",
      background: `${c}0a`,
      border: `1px solid ${c}1a`,
      borderRadius: "5px",
    }}>
      <div style={{ fontSize: "0.46rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "2px" }}>
        {cell.label}
      </div>
      <div style={{ fontSize: "0.72rem", fontWeight: 800, color: c, fontVariantNumeric: "tabular-nums", fontFamily: "'JetBrains Mono',monospace" }}>
        {cell.value}
      </div>
    </div>
  );
}

// ─── Stream status indicator ───────────────────────────────────────────────────
const STATUS_MSG: Record<StreamStatus, string> = {
  live:         "DEFILLAMA · LIVE",
  idle:         "MONITORING GLOBAL LIQUIDITY RAILS",
  reconnecting: "REESTABLISHING SECURE HANDSHAKE",
  error:        "ORACLE FALLBACK · LOCAL MODE",
};
const STATUS_COLOR: Record<StreamStatus, string> = {
  live:         "#3dd68c",
  idle:         "#6b8cff",
  reconnecting: "#FBBF24",
  error:        "#f26b6b",
};

// ─── Main component ────────────────────────────────────────────────────────────
export function MacroTelemetryPanel() {
  const [data,     setData]     = useState<MacroData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [status,   setStatus]   = useState<StreamStatus>("idle");
  const [tick,     setTick]     = useState(0);
  const timerRef   = useRef<ReturnType<typeof setInterval>>();

  const load = async () => {
    try {
      setStatus("reconnecting");
      const res = await fetch("/api/macro");
      if (!res.ok) throw new Error("macro API error");
      const d = await res.json();
      if (d.ok) {
        setData(d);
        setStatus(d.source === "defillama_live" ? "live" : "idle");
      } else throw new Error("bad response");
    } catch {
      setStatus("error");
      // Keep previous data visible — graceful degradation
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Poll every 5 minutes
    timerRef.current = setInterval(load, 5 * 60 * 1000);
    // Heartbeat tick every 4s for the pulse animation
    const hb = setInterval(() => setTick(t => t + 1), 4000);
    return () => {
      clearInterval(timerRef.current);
      clearInterval(hb);
    };
  }, []);

  // Derived heatmap cells
  const heatCells: HeatCell[] = useMemo(() => {
    if (!data) return [];
    const tvlChange = data.solana.change24h;
    const usdcFlow  = data.stablecoins.find(s => s.symbol === "USDC");
    const totalStable = data.stablecoins.reduce((a, s) => a + s.circulating, 0);
    return [
      { label: "Solana TVL", value: data.solana.tvlFormatted, pct: 100, trend: tvlChange >= 0 ? "up" : "dn" },
      { label: "USDC Flow",  value: usdcFlow ? `$${(usdcFlow.circulating / 1e9).toFixed(1)}B` : "—", pct: 80, trend: (usdcFlow?.change24h ?? 0) >= 0 ? "up" : "dn" },
      { label: "Stable Dom.", value: `$${(totalStable / 1e9).toFixed(1)}B`, pct: 60, trend: "flat" },
      { label: "24H Change",  value: `${tvlChange >= 0 ? "+" : ""}${tvlChange.toFixed(2)}%`, pct: 50, trend: tvlChange >= 0 ? "up" : "dn" },
    ];
  }, [data]);

  const sc = STATUS_COLOR[status];
  const maxStable = data?.stablecoins?.[0]?.circulating ?? 1;

  // Skeleton
  if (loading) return (
    <div style={{
      background: "rgba(6,8,16,0.97)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "12px", padding: "1rem", height: 320,
      animation: "pulse 1.5s ease-in-out infinite",
      fontFamily: "'JetBrains Mono',monospace",
    }}>
      <div style={{ width: 160, height: "0.6rem", background: "rgba(255,255,255,0.06)", borderRadius: "3px", marginBottom: "1rem" }} />
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginBottom: "1rem" }}>
        {[0,1,2].map(i => <div key={i} style={{ width: 96, height: 96, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />)}
      </div>
    </div>
  );

  return (
    <div style={{
      background: "rgba(6,8,16,0.97)",
      border:     "1px solid rgba(107,140,255,0.12)",
      borderRadius: "12px",
      overflow:   "hidden",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {/* Header */}
      <div style={{
        padding:      "0.625rem 1rem",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display:      "flex",
        justifyContent: "space-between",
        alignItems:   "center",
        background:   "rgba(107,140,255,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: sc, flexShrink: 0,
            animation: status !== "error" ? "pulse 2s ease-in-out infinite" : "none",
            boxShadow: `0 0 6px ${sc}`,
          }} />
          <span style={{ fontSize: "0.58rem", fontWeight: 700, color: sc, letterSpacing: "0.12em" }}>
            {STATUS_MSG[status]}
          </span>
        </div>
        <span style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em" }}>
          {data ? new Date(data.updatedAt).toLocaleTimeString() : "—"}
        </span>
      </div>

      <div style={{ padding: "1rem" }}>
        {/* Radial gauges row */}
        {data && (
          <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <RadialGauge value={data.solana.tvl} max={10e9}   label="SOL TVL"    color="#6b8cff" />
            <RadialGauge value={data.stablecoins.reduce((a,s)=>a+s.circulating,0)} max={5e9} label="STABLE"  color="#3dd68c" />
            <RadialGauge value={data.solana.tvl * 0.15} max={2e9} label="RWA EST"  color="#D4AF37" />
          </div>
        )}

        {/* Heatmap */}
        {heatCells.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "0.4rem", marginBottom: "1rem" }}>
            {heatCells.map(cell => <HeatCell key={cell.label} cell={cell} />)}
          </div>
        )}

        {/* Stablecoin flow bars */}
        {data && data.stablecoins.length > 0 && (
          <div>
            <div style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
              Stablecoin Absorption · Solana Rails
            </div>
            {data.stablecoins.map((s, i) => {
              const colors = ["#6b8cff","#3dd68c","#D4AF37","#a855f7","#f26b6b","#60A5FA"];
              return (
                <FlowBar key={s.symbol} symbol={s.symbol}
                  value={s.circulating} max={maxStable}
                  change={s.change24h} color={colors[i % colors.length]} />
              );
            })}
          </div>
        )}

        {/* No data fallback */}
        {!data && (
          <div style={{ padding: "1.5rem", textAlign: "center", fontSize: "0.6rem", color: "rgba(255,255,255,0.25)" }}>
            {status === "reconnecting" ? "[REESTABLISHING SECURE HANDSHAKE…]" : "[ORACLE UNAVAILABLE · LOCAL MODE]"}
          </div>
        )}
      </div>
    </div>
  );
}