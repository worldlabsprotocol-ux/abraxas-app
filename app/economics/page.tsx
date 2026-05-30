"use client";
// FILE: app/economics/page.tsx
// Abraxas Platform Economics — Investor-Grade Financial Model
// All data sourced directly from Abraxas_Sensitivity_ProForma.xlsx
// Design: Bloomberg × Goldman Sachs IM × institutional dark terminal

import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

// ── Design tokens (Abraxas institutional) ───────────────────────────
const C = {
  bg:      "#0A0C10",
  surface: "#0D1117",
  card:    "#111620",
  border:  "#1C2333",
  green:   "#10B981",
  amber:   "#F59E0B",
  blue:    "#3B82F6",
  red:     "#EF4444",
  muted:   "rgba(255,255,255,0.25)",
  dim:     "rgba(255,255,255,0.10)",
  white:   "#F8FAFC",
};
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const SERIF = "'Georgia','Times New Roman',serif";
const SANS  = "'Inter var','Inter',system-ui,sans-serif";

// ── Data from Excel model ────────────────────────────────────────────
const SCENARIOS = {
  small: {
    label: "Small Assets",
    sub:   "$1–3M avg",
    color: C.amber,
    years: ["Year 1", "Year 2", "Year 3"],
    metrics: {
      assetsVerified:  [75, 250, 500],
      tokenizedAUM:    [112.5, 595.6, 1786.1],
      revenue:         [1.33, 7.12, 21.43],
      ebitda:          [-5.19, -6.87, -3.20],
      ebitdaMargin:    [-389.1, -96.5, -14.9],
      grossMargin:     [-87.5, 6.8, 44.2],
      headcount:       [22, 50, 88],
      verificationFees:[0.563, 2.500, 6.250],
      tokenizationFees:[0.281, 1.250, 3.125],
      platformFees:    [0.422, 2.655, 8.931],
      lendingRevenue:  [0.068, 0.717, 3.126],
      loanVolume:      [4.5, 47.8, 208.4],
    },
  },
  large: {
    label: "Large Assets",
    sub:   "$15–25M avg",
    color: C.green,
    years: ["Year 1", "Year 2", "Year 3"],
    metrics: {
      assetsVerified:  [25, 75, 150],
      tokenizedAUM:    [375.0, 1818.8, 5386.9],
      revenue:         [4.57, 22.64, 67.04],
      ebitda:          [-0.21, 13.18, 49.95],
      ebitdaMargin:    [-4.6, 58.2, 74.5],
      grossMargin:     [74.8, 87.6, 91.8],
      headcount:       [15, 30, 55],
      verificationFees:[1.875, 7.500, 18.750],
      tokenizationFees:[0.938, 3.750, 9.375],
      platformFees:    [1.406, 8.227, 27.021],
      lendingRevenue:  [0.352, 3.167, 11.889],
      loanVolume:      [23.4, 211.1, 792.6],
    },
  },
};

// Revenue breakdown chart data
const revenueData = [
  { year: "Y1 Small", verification: 0.563, tokenization: 0.281, platform: 0.422, lending: 0.068 },
  { year: "Y2 Small", verification: 2.500, tokenization: 1.250, platform: 2.655, lending: 0.717 },
  { year: "Y3 Small", verification: 6.250, tokenization: 3.125, platform: 8.931, lending: 3.126 },
  { year: "Y1 Large", verification: 1.875, tokenization: 0.938, platform: 1.406, lending: 0.352 },
  { year: "Y2 Large", verification: 7.500, tokenization: 3.750, platform: 8.227, lending: 3.167 },
  { year: "Y3 Large", verification: 18.750, tokenization: 9.375, platform: 27.021, lending: 11.889 },
];

// AUM growth data
const aumData = [
  { year: "Y1", small: 112.5, large: 375.0 },
  { year: "Y2", small: 595.6, large: 1818.8 },
  { year: "Y3", small: 1786.1, large: 5386.9 },
];

// EBITDA comparison
const ebitdaData = [
  { year: "Year 1", small: -5.19, large: -0.21 },
  { year: "Year 2", small: -6.87, large: 13.18 },
  { year: "Year 3", small: -3.20, large: 49.95 },
];

// Margin expansion
const marginData = [
  { year: "Year 1", smallGross: -87.5, largeGross: 74.8, smallEBITDA: null, largeEBITDA: null },
  { year: "Year 2", smallGross: 6.8,   largeGross: 87.6, smallEBITDA: null, largeEBITDA: 58.2 },
  { year: "Year 3", smallGross: 44.2,  largeGross: 91.8, smallEBITDA: null, largeEBITDA: 74.5 },
];

// Unit economics
const unitEcon = {
  small: { revenuePerAsset: [17775, 28490, 42865], onboardingMargin: [-107.4, -34.4, 1.3] },
  large: { revenuePerAsset: [182813, 301917, 446903], onboardingMargin: [75.1, 84.0, 86.8] },
};

// ── Helper components ────────────────────────────────────────────────
function fmt(n: number, prefix = "$", suffix = "M"): string {
  if (suffix === "M") return `${prefix}${Math.abs(n).toFixed(1)}${n < 0 ? " (loss)" : suffix}`;
  return `${prefix}${n.toFixed(1)}${suffix}`;
}
function fmtBig(n: number): string {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}B`;
  return `$${n.toFixed(0)}M`;
}
function pct(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}
function currency(n: number): string {
  return n < 0 ? `($${Math.abs(n).toFixed(2)}M)` : `$${n.toFixed(2)}M`;
}

const CustomTooltip = ({ active, payload, label, unit = "M" }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
                   padding: "0.625rem 0.875rem", fontFamily: MONO }}>
      <div style={{ fontSize: "0.42rem", color: C.muted, marginBottom: "0.3rem" }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ fontSize: "0.46rem", color: p.color, marginBottom: "0.15rem" }}>
          {p.name}: {unit === "%" ? `${p.value?.toFixed(1)}%` : unit === "$k" ? `$${(p.value / 1000).toFixed(0)}k` : `$${p.value?.toFixed(1)}M`}
        </div>
      ))}
    </div>
  );
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: "0.3rem", fontWeight: 700,
                   color: `${C.green}80`, textTransform: "uppercase",
                   letterSpacing: "0.2em", marginBottom: "0.75rem" }}>
      {children}
    </div>
  );
}

function Rule() {
  return <div style={{ height: 1, background: C.border, margin: "3rem 0" }} />;
}

// ── Counter animation ────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 1 }:
  { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const step = value / 40;
        const t = setInterval(() => {
          start += step;
          if (start >= value) { setDisplay(value); clearInterval(t); }
          else setDisplay(start);
        }, 30);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [value]);

  return (
    <span ref={ref}>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────────
export default function EconomicsPage() {
  const [activeScenario, setActiveScenario] = useState<"small" | "large">("large");
  const S = SCENARIOS[activeScenario];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.white }}>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section style={{
        padding: "clamp(4rem,8vw,7rem) clamp(1.5rem,5vw,3rem) clamp(3rem,5vw,5rem)",
        borderBottom: `1px solid ${C.border}`,
        maxWidth: 1100, margin: "0 auto",
      }}>
        <SectionLabel>Platform Economics · Investor Overview</SectionLabel>
        <h1 style={{
          fontFamily: SERIF,
          fontSize: "clamp(2rem,5vw,3.8rem)",
          fontWeight: 400, color: C.white, margin: "0 0 1.5rem",
          letterSpacing: "-0.02em", lineHeight: 1.1, maxWidth: 780,
        }}>
          Real revenue. Real assets.<br />
          <em style={{ color: C.green }}>Sustainable economics.</em>
        </h1>
        <p style={{
          fontFamily: SANS, fontSize: "clamp(0.85rem,1.8vw,1.05rem)",
          color: C.muted, lineHeight: 1.8, maxWidth: 620, margin: "0 0 3rem",
        }}>
          Abraxas is engineered around recurring fee streams tied to assets under
          management — not speculative token activity. The economic model rewards
          institutional-scale assets: verification workload grows slowly, revenue grows
          rapidly, and margins compound over time.
        </p>

        {/* Key stats */}
        <div style={{ display: "grid",
                       gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                       gap: "1px", border: `1px solid ${C.border}`,
                       borderRadius: 8, overflow: "hidden" }}>
          {[
            { label: "Year 3 AUM (Large Path)",   value: 5386.9, prefix: "$", suffix: "M", color: C.green },
            { label: "Year 3 Revenue (Large)",     value: 67.04,  prefix: "$", suffix: "M", color: C.green },
            { label: "Year 3 EBITDA Margin",       value: 74.5,   prefix: "",  suffix: "%",  color: C.green },
            { label: "Revenue Per Large Asset (Y3)",value: 446903/1000, prefix:"$",suffix:"k",color: C.amber },
          ].map(s => (
            <div key={s.label} style={{ background: C.surface, padding: "1.5rem 1.25rem" }}>
              <div style={{ fontFamily: MONO, fontSize: "0.3rem", color: C.muted,
                             textTransform: "uppercase", letterSpacing: "0.12em",
                             marginBottom: "0.5rem" }}>
                {s.label}
              </div>
              <div style={{ fontFamily: MONO, fontSize: "clamp(1.2rem,3vw,2rem)",
                             fontWeight: 900, color: s.color }}>
                <AnimatedNumber value={s.value} prefix={s.prefix} suffix={s.suffix}
                                decimals={s.suffix === "%" || s.suffix === "k" ? 1 : 1} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ maxWidth: 1100, margin: "0 auto",
                     padding: "0 clamp(1.5rem,5vw,3rem)" }}>

        {/* ── REVENUE ENGINE ─────────────────────────────────────────── */}
        <section style={{ padding: "3rem 0" }}>
          <SectionLabel>Revenue Architecture</SectionLabel>
          <h2 style={{ fontFamily: SERIF, fontSize: "clamp(1.4rem,3vw,2.2rem)",
                        fontWeight: 400, color: C.white, margin: "0 0 0.75rem",
                        letterSpacing: "-0.02em" }}>
            Four compounding revenue streams.
          </h2>
          <p style={{ fontFamily: SANS, fontSize: "clamp(0.78rem,1.6vw,0.9rem)",
                       color: C.muted, lineHeight: 1.8, maxWidth: 580,
                       margin: "0 0 2.5rem" }}>
            Abraxas generates revenue at each stage of the asset lifecycle — from
            initial verification through ongoing platform participation and lending
            activity. Recurring streams scale with AUM without proportional cost increases.
          </p>

          <div style={{ display: "grid",
                         gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
                         gap: "1rem", marginBottom: "2.5rem" }}>
            {[
              {
                icon: "◉", color: "#3B82F6", title: "Verification Fees",
                badge: "One-time · 0.50% of asset value",
                desc: "Charged during due diligence and documentation review. Covers legal analysis, title search, appraisal coordination, and AAS-1 certification issuance.",
                y3Small: "$6.25M", y3Large: "$18.75M",
              },
              {
                icon: "◈", color: "#8B5CF6", title: "Tokenization Fees",
                badge: "One-time · 0.25% of asset value",
                desc: "Charged at issuance when the Token-2022 certificate is minted on Solana mainnet. Scales linearly with the value of each asset brought on-chain.",
                y3Small: "$3.13M", y3Large: "$9.38M",
              },
              {
                icon: "◆", color: C.green, title: "Platform Fees",
                badge: "Recurring · 0.75% of AUM/year",
                desc: "Annual fee on tokenized assets under management. This is the compounding engine: once assets are onboarded, the fee base grows as AUM retention compounds each year.",
                y3Small: "$8.93M", y3Large: "$27.02M",
              },
              {
                icon: "⬡", color: C.amber, title: "Lending Revenue",
                badge: "Recurring · 1.50% of loan volume",
                desc: "Spread and origination revenue on USDC loans drawn against verified collateral. Scales with both AUM and loan utilization rates, which increase as borrower confidence grows.",
                y3Small: "$3.13M", y3Large: "$11.89M",
              },
            ].map(r => (
              <div key={r.title} style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: "1.25rem",
                borderTop: `2px solid ${r.color}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem",
                               marginBottom: "0.75rem" }}>
                  <span style={{ color: r.color, fontSize: "0.8rem" }}>{r.icon}</span>
                  <span style={{ fontFamily: MONO, fontSize: "0.5rem", fontWeight: 700,
                                  color: C.white }}>{r.title}</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: "0.3rem", color: r.color,
                               marginBottom: "0.625rem",
                               background: `${r.color}12`,
                               border: `1px solid ${r.color}25`,
                               borderRadius: 3, padding: "2px 7px",
                               display: "inline-block" }}>
                  {r.badge}
                </div>
                <p style={{ fontFamily: SANS, fontSize: "0.7rem", color: C.muted,
                             lineHeight: 1.7, margin: "0 0 1rem" }}>
                  {r.desc}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
                               gap: "0.5rem", borderTop: `1px solid ${C.border}`,
                               paddingTop: "0.75rem" }}>
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: "0.28rem",
                                   color: C.amber, marginBottom: "0.15rem" }}>
                      Y3 SMALL
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: "0.6rem",
                                   fontWeight: 700, color: C.amber }}>{r.y3Small}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: "0.28rem",
                                   color: C.green, marginBottom: "0.15rem" }}>
                      Y3 LARGE
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: "0.6rem",
                                   fontWeight: 700, color: C.green }}>{r.y3Large}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Revenue waterfall chart */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`,
                         borderRadius: 8, padding: "1.5rem" }}>
            <div style={{ fontFamily: MONO, fontSize: "0.3rem", color: C.muted,
                           textTransform: "uppercase", letterSpacing: "0.12em",
                           marginBottom: "1rem" }}>
              Revenue Composition by Year and Scenario ($M)
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="year" tick={{ fill: C.muted, fontFamily: MONO, fontSize: 10 }} />
                <YAxis tick={{ fill: C.muted, fontFamily: MONO, fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontFamily: MONO, fontSize: 10, color: C.muted }} />
                <Bar dataKey="verification" name="Verification" stackId="a" fill="#3B82F6" />
                <Bar dataKey="tokenization" name="Tokenization" stackId="a" fill="#8B5CF6" />
                <Bar dataKey="platform"     name="Platform AUM" stackId="a" fill={C.green} />
                <Bar dataKey="lending"      name="Lending"      stackId="a" fill={C.amber} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <Rule />

        {/* ── OPERATING LEVERAGE ─────────────────────────────────────── */}
        <section style={{ padding: "0 0 3rem" }}>
          <SectionLabel>Operating Leverage</SectionLabel>
          <h2 style={{ fontFamily: SERIF, fontSize: "clamp(1.4rem,3vw,2.2rem)",
                        fontWeight: 400, color: C.white, margin: "0 0 0.75rem",
                        letterSpacing: "-0.02em" }}>
            Why larger assets compound faster.
          </h2>
          <p style={{ fontFamily: SANS, fontSize: "clamp(0.78rem,1.6vw,0.9rem)",
                       color: C.muted, lineHeight: 1.8, maxWidth: 600,
                       margin: "0 0 2rem" }}>
            Verification cost scales with the number of assets, not their value.
            A $25M asset requires similar due diligence to a $2M asset — but
            generates 12.5× more fee revenue. This asymmetry drives margin expansion.
          </p>

          {/* Leverage visualization */}
          <div style={{ display: "grid",
                         gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                         gap: "1rem", marginBottom: "2rem" }}>
            {[
              {
                label: "Revenue per asset (Year 3)", icon: "↑",
                small: "$42,865", large: "$446,903",
                ratio: "10.4×", ratioColor: C.green,
                insight: "Larger assets generate 10× more per-asset revenue with equivalent verification effort.",
              },
              {
                label: "Verification analysts needed (Year 3)", icon: "↓",
                small: "50 analysts", large: "20 analysts",
                ratio: "2.5×", ratioColor: C.amber,
                insight: "Small-asset path requires 2.5× the verification headcount to process similar AUM.",
              },
              {
                label: "Onboarding margin per asset (Year 3)", icon: "◉",
                small: "+1.3%", large: "+86.8%",
                ratio: "67×", ratioColor: C.green,
                insight: "Large assets are immediately profitable on Day 1. Small assets break even only in Year 3.",
              },
              {
                label: "Year 3 EBITDA margin", icon: "◆",
                small: "−14.9%", large: "+74.5%",
                ratio: "89 pts", ratioColor: C.green,
                insight: "The margin divergence is 89 percentage points by Year 3 — a structural advantage of asset scale.",
              },
            ].map(item => (
              <div key={item.label} style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: "1.25rem",
              }}>
                <div style={{ fontFamily: MONO, fontSize: "0.3rem", color: C.muted,
                               textTransform: "uppercase", letterSpacing: "0.1em",
                               marginBottom: "0.875rem" }}>
                  {item.label}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr",
                               gap: "0.5rem", alignItems: "center",
                               marginBottom: "0.875rem" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: MONO, fontSize: "0.28rem",
                                   color: C.amber, marginBottom: "0.25rem" }}>SMALL</div>
                    <div style={{ fontFamily: MONO, fontSize: "0.72rem",
                                   fontWeight: 700, color: C.amber }}>{item.small}</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "0.25rem 0.5rem",
                                  background: `${item.ratioColor}15`,
                                  border: `1px solid ${item.ratioColor}30`,
                                  borderRadius: 4 }}>
                    <div style={{ fontFamily: MONO, fontSize: "0.56rem",
                                   fontWeight: 900, color: item.ratioColor }}>
                      {item.ratio}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: MONO, fontSize: "0.28rem",
                                   color: C.green, marginBottom: "0.25rem" }}>LARGE</div>
                    <div style={{ fontFamily: MONO, fontSize: "0.72rem",
                                   fontWeight: 700, color: C.green }}>{item.large}</div>
                  </div>
                </div>
                <p style={{ fontFamily: SANS, fontSize: "0.65rem", color: C.dim,
                             lineHeight: 1.65, margin: 0, borderTop: `1px solid ${C.border}`,
                             paddingTop: "0.75rem" }}>
                  {item.insight}
                </p>
              </div>
            ))}
          </div>

          {/* Margin expansion chart */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`,
                         borderRadius: 8, padding: "1.5rem" }}>
            <div style={{ fontFamily: MONO, fontSize: "0.3rem", color: C.muted,
                           textTransform: "uppercase", letterSpacing: "0.12em",
                           marginBottom: "1rem" }}>
              Gross Margin Progression (%) — Scale Creates Structural Advantage
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={marginData} margin={{ top: 10, right: 30, bottom: 10, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="year" tick={{ fill: C.muted, fontFamily: MONO, fontSize: 10 }} />
                <YAxis domain={[-100, 100]} tick={{ fill: C.muted, fontFamily: MONO, fontSize: 10 }} />
                <Tooltip content={<CustomTooltip unit="%" />} />
                <ReferenceLine y={0} stroke={C.border} strokeWidth={2} />
                <Legend wrapperStyle={{ fontFamily: MONO, fontSize: 10, color: C.muted }} />
                <Line dataKey="largeGross" name="Large — Gross Margin"
                      stroke={C.green} strokeWidth={2.5} dot={{ r: 4, fill: C.green }}
                      connectNulls />
                <Line dataKey="smallGross" name="Small — Gross Margin"
                      stroke={C.amber} strokeWidth={2} strokeDasharray="5 3"
                      dot={{ r: 4, fill: C.amber }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <Rule />

        {/* ── SCENARIO ANALYSIS ──────────────────────────────────────── */}
        <section style={{ padding: "0 0 3rem" }}>
          <SectionLabel>Scenario Analysis</SectionLabel>
          <h2 style={{ fontFamily: SERIF, fontSize: "clamp(1.4rem,3vw,2.2rem)",
                        fontWeight: 400, color: C.white, margin: "0 0 0.75rem",
                        letterSpacing: "-0.02em" }}>
            Three-year financial projections.
          </h2>
          <p style={{ fontFamily: SANS, fontSize: "clamp(0.78rem,1.6vw,0.9rem)",
                       color: C.muted, lineHeight: 1.8, maxWidth: 580,
                       margin: "0 0 2rem" }}>
            Two scenarios modeled across identical fee structures and operating
            assumptions. The sole variable: average asset value.
          </p>

          {/* Scenario selector */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem",
                         flexWrap: "wrap" }}>
            {(["small", "large"] as const).map(k => (
              <button key={k} onClick={() => setActiveScenario(k)} style={{
                padding: "0.5rem 1.25rem", borderRadius: 5, cursor: "pointer",
                border: `1px solid ${activeScenario === k ? SCENARIOS[k].color : C.border}`,
                background: activeScenario === k ? `${SCENARIOS[k].color}15` : C.surface,
                color: activeScenario === k ? SCENARIOS[k].color : C.muted,
                fontFamily: MONO, fontSize: "0.38rem", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.08em",
                transition: "all 0.15s",
              }}>
                {SCENARIOS[k].label} ({SCENARIOS[k].sub})
              </button>
            ))}
          </div>

          {/* Year cards */}
          <div style={{ display: "grid",
                         gridTemplateColumns: "repeat(3, 1fr)",
                         gap: "1rem", marginBottom: "2rem" }}>
            {[0, 1, 2].map(y => {
              const revenue  = S.metrics.revenue[y];
              const ebitda   = S.metrics.ebitda[y];
              const aum      = S.metrics.tokenizedAUM[y];
              const margin   = S.metrics.ebitdaMargin[y];
              const isProfit = ebitda > 0;
              return (
                <div key={y} style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: "1.25rem",
                  borderTop: `2px solid ${isProfit ? C.green : C.red}`,
                }}>
                  <div style={{ fontFamily: MONO, fontSize: "0.3rem", color: C.muted,
                                 textTransform: "uppercase", letterSpacing: "0.1em",
                                 marginBottom: "0.75rem" }}>
                    {S.years[y]}
                  </div>
                  {[
                    { label: "Assets Verified",   value: `${S.metrics.assetsVerified[y]}` },
                    { label: "Tokenized AUM",      value: fmtBig(aum) },
                    { label: "Total Revenue",      value: `$${revenue.toFixed(2)}M` },
                    { label: "Gross Margin",       value: `${S.metrics.grossMargin[y].toFixed(1)}%` },
                    { label: "EBITDA",             value: currency(ebitda), color: isProfit ? C.green : C.red },
                    { label: "EBITDA Margin",      value: `${margin.toFixed(1)}%`, color: isProfit ? C.green : C.red },
                    { label: "Headcount",          value: `${S.metrics.headcount[y]} FTEs` },
                  ].map(row => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between",
                                                   padding: "0.35rem 0",
                                                   borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontFamily: SANS, fontSize: "0.66rem", color: C.muted }}>{row.label}</span>
                      <span style={{ fontFamily: MONO, fontSize: "0.62rem", fontWeight: 700,
                                      color: row.color ?? C.white }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* AUM + EBITDA charts side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`,
                           borderRadius: 8, padding: "1.25rem" }}>
              <div style={{ fontFamily: MONO, fontSize: "0.3rem", color: C.muted,
                             textTransform: "uppercase", letterSpacing: "0.1em",
                             marginBottom: "0.875rem" }}>
                Tokenized AUM Growth ($M)
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={aumData}>
                  <defs>
                    <linearGradient id="gradLarge" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.green} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradSmall" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.amber} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.amber} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="year" tick={{ fill: C.muted, fontFamily: MONO, fontSize: 10 }} />
                  <YAxis tick={{ fill: C.muted, fontFamily: MONO, fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontFamily: MONO, fontSize: 10, color: C.muted }} />
                  <Area type="monotone" dataKey="large" name="Large Assets"
                        stroke={C.green} fill="url(#gradLarge)" strokeWidth={2} />
                  <Area type="monotone" dataKey="small" name="Small Assets"
                        stroke={C.amber} fill="url(#gradSmall)" strokeWidth={2} strokeDasharray="5 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`,
                           borderRadius: 8, padding: "1.25rem" }}>
              <div style={{ fontFamily: MONO, fontSize: "0.3rem", color: C.muted,
                             textTransform: "uppercase", letterSpacing: "0.1em",
                             marginBottom: "0.875rem" }}>
                EBITDA Trajectory ($M)
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ebitdaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="year" tick={{ fill: C.muted, fontFamily: MONO, fontSize: 10 }} />
                  <YAxis tick={{ fill: C.muted, fontFamily: MONO, fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.3)" />
                  <Legend wrapperStyle={{ fontFamily: MONO, fontSize: 10, color: C.muted }} />
                  <Bar dataKey="large" name="Large Assets" fill={C.green} radius={[3,3,0,0]} />
                  <Bar dataKey="small" name="Small Assets" fill={C.amber} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <Rule />

        {/* ── KEY FINDINGS ───────────────────────────────────────────── */}
        <section style={{ padding: "0 0 3rem" }}>
          <SectionLabel>Key Findings</SectionLabel>
          <h2 style={{ fontFamily: SERIF, fontSize: "clamp(1.4rem,3vw,2.2rem)",
                        fontWeight: 400, color: C.white, margin: "0 0 2rem",
                        letterSpacing: "-0.02em" }}>
            Strategic conclusions from the model.
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              {
                n: "01", color: C.green,
                title: "Asset value is the single most leveraged variable.",
                desc: "Doubling average asset value from $1.5M to $3M has a larger impact on economics than doubling the number of assets verified. Verification cost is per-asset, not per-dollar.",
              },
              {
                n: "02", color: C.green,
                title: "Verification capacity is the primary operational constraint.",
                desc: "The small-asset path requires 50 verification analysts in Year 3 vs. 20 for the large-asset path — processing similar aggregate dollar volume. Automation and tiered review are essential for small-asset economics.",
              },
              {
                n: "03", color: C.green,
                title: "Recurring AUM fees are the long-term value driver.",
                desc: "Platform fees on AUM compound annually with retention. By Year 3, the large-asset path generates $27M in platform fees alone — more than the total revenue of the small-asset path in Year 2.",
              },
              {
                n: "04", color: C.amber,
                title: "Hybrid sourcing balances growth and institutional credibility.",
                desc: "Showcase assets like Cielo Sunrise ($1.1M) serve proof-of-concept and community trust functions. The revenue engine should be built on $10M+ institutional deals where unit economics are immediately profitable.",
              },
              {
                n: "05", color: C.green,
                title: "Margin expansion is structural, not cyclical.",
                desc: "The large-asset path reaches 74.5% EBITDA margins in Year 3. This is a direct consequence of fixed verification infrastructure supporting an exponentially growing AUM base — the classic operating leverage curve.",
              },
              {
                n: "06", color: "#3B82F6",
                title: "The path to profitability is dramatically shorter with large assets.",
                desc: "Large-asset path reaches near-breakeven in Year 1 (−4.6% EBITDA margin) and is solidly profitable in Year 2 (+58.2%). Small-asset path remains unprofitable through all three modeled years.",
              },
            ].map(f => (
              <div key={f.n} style={{
                display: "grid", gridTemplateColumns: "64px 1fr",
                gap: "1rem", padding: "1.25rem",
                background: C.surface, border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${f.color}`, borderRadius: 8,
                alignItems: "start",
              }}>
                <div style={{ fontFamily: MONO,
                               fontSize: "clamp(1.2rem,3vw,1.8rem)",
                               fontWeight: 900, color: `${f.color}30`,
                               lineHeight: 1 }}>
                  {f.n}
                </div>
                <div>
                  <div style={{ fontFamily: SANS, fontSize: "clamp(0.82rem,1.8vw,0.98rem)",
                                 fontWeight: 700, color: C.white, marginBottom: "0.35rem" }}>
                    {f.title}
                  </div>
                  <div style={{ fontFamily: SANS, fontSize: "clamp(0.7rem,1.5vw,0.82rem)",
                                 color: C.muted, lineHeight: 1.75 }}>
                    {f.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Rule />

        {/* ── FEE STRUCTURE REFERENCE ────────────────────────────────── */}
        <section style={{ padding: "0 0 3rem" }}>
          <SectionLabel>Fee Structure Reference</SectionLabel>
          <h2 style={{ fontFamily: SERIF, fontSize: "clamp(1.4rem,3vw,2.2rem)",
                        fontWeight: 400, color: C.white, margin: "0 0 2rem",
                        letterSpacing: "-0.02em" }}>
            Transparent pricing — identical across scenarios.
          </h2>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 1fr",
                           padding: "0.625rem 1.25rem",
                           borderBottom: `1px solid ${C.border}`,
                           background: C.card, fontFamily: MONO, fontSize: "0.28rem",
                           color: C.muted, textTransform: "uppercase",
                           letterSpacing: "0.1em" }}>
              <span>FEE TYPE</span>
              <span style={{ textAlign: "center" }}>RATE</span>
              <span style={{ textAlign: "center" }}>TYPE</span>
              <span>BASIS</span>
            </div>
            {[
              { type: "Verification Fee",    rate: "0.50%", kind: "One-time",  basis: "Asset value at onboarding" },
              { type: "Tokenization Fee",    rate: "0.25%", kind: "One-time",  basis: "Asset value at issuance" },
              { type: "Platform Fee",        rate: "0.75%", kind: "Recurring", basis: "Average AUM per year" },
              { type: "Lending Take Rate",   rate: "1.50%", kind: "Recurring", basis: "Total loan volume originated" },
            ].map((row, i) => (
              <div key={row.type} style={{
                display: "grid", gridTemplateColumns: "1fr 80px 80px 1fr",
                padding: "0.875rem 1.25rem", alignItems: "center",
                borderBottom: i < 3 ? `1px solid ${C.border}` : "none",
                background: i % 2 === 0 ? C.surface : "transparent",
              }}>
                <span style={{ fontFamily: SANS, fontSize: "0.78rem",
                                fontWeight: 600, color: C.white }}>{row.type}</span>
                <span style={{ fontFamily: MONO, fontSize: "0.72rem",
                                fontWeight: 700, color: C.green,
                                textAlign: "center" }}>{row.rate}</span>
                <span style={{ fontFamily: MONO, fontSize: "0.36rem", textAlign: "center",
                                color: row.kind === "Recurring" ? C.green : C.amber,
                                background: row.kind === "Recurring" ? `${C.green}12` : `${C.amber}12`,
                                border: `1px solid ${row.kind === "Recurring" ? C.green : C.amber}30`,
                                borderRadius: 3, padding: "2px 6px", display: "inline-block" }}>
                  {row.kind}
                </span>
                <span style={{ fontFamily: SANS, fontSize: "0.72rem",
                                color: C.muted }}>{row.basis}</span>
              </div>
            ))}
          </div>
        </section>

        <Rule />

        {/* ── INVESTOR DISCLOSURE ────────────────────────────────────── */}
        <section style={{ padding: "0 0 5rem" }}>
          <div style={{
            padding: "2rem", background: C.surface,
            border: `1px solid ${C.border}`, borderRadius: 8,
          }}>
            <div style={{ fontFamily: MONO, fontSize: "0.3rem", color: C.muted,
                           textTransform: "uppercase", letterSpacing: "0.15em",
                           marginBottom: "0.875rem" }}>
              Investor Disclosure
            </div>
            <p style={{ fontFamily: SERIF, fontSize: "clamp(0.78rem,1.6vw,0.9rem)",
                         color: `${C.muted}`, lineHeight: 1.85, margin: 0 }}>
              These projections are illustrative and based on current fee structures,
              assumed onboarding velocity, modeled verification capacity, and projected
              AUM retention rates. Actual results will vary based on market conditions,
              regulatory environment, competitive dynamics, asset sourcing outcomes, and
              execution. The sensitivity pro forma presented here models two scenarios
              across identical fee and cost assumptions — the sole variable is average
              asset value. Neither scenario constitutes a guarantee of future performance.
              Abraxas does not provide investment advice. This material is provided for
              informational and strategic planning purposes only.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
