// FILE: app/rwa/page.tsx
// IP / RWA Command Center.
// Top row: Stability (Ondo $USDY, $OUSG, Real Estate)
// Bottom row: Growth (Collector Crypt, Baxus, Credix)
// All data stubs — replace with live API calls when keys are available.
"use client";

import Link from "next/link";
import { useState } from "react";

// ─── Ondo Finance cards ───────────────────────────────────────────────────────
// Stub — replace fetch with Ondo GM API: https://api.ondofinance.com
const ONDO_ASSETS = [
  { symbol: "$USDY",  name: "USD Yield",           apy: 5.20, backing: "BlackRock + Fidelity", category: "stable",   riskLabel: "LOW",   liquidity: "Daily",    tvl: "$450M", description: "Tokenized US Treasury yield. Daily accrual. Instant redemption." },
  { symbol: "$OUSG",  name: "Short-Term Treasuries", apy: 5.08, backing: "BlackRock",           category: "stable",   riskLabel: "LOW",   liquidity: "T+1",      tvl: "$320M", description: "Institutional short-term US government securities." },
];

// ─── Growth assets ────────────────────────────────────────────────────────────
const GROWTH_ASSETS = [
  { symbol: "PNFT",   name: "Collector Crypt",      apy: null, category: "collectibles", riskLabel: "HIGH",  liquidity: "Immediate", tvl: "Variable", description: "Physical pNFTs — Pokémon, sports cards. Buy-and-borrow via Sharky/Citrus." },
  { symbol: "SPIRITS",name: "Baxus Spirits",        apy: null, category: "liquids",      riskLabel: "MED",   liquidity: "7-14d",    tvl: "Variable", description: "Rare whisky + wine. Store of value during inflation. Below-index alerts." },
  { symbol: "CRED",   name: "Credix Private Credit",apy: 12.0, category: "credit",       riskLabel: "HIGH",  liquidity: "90d lock", tvl: "$60M",     description: "Emerging market fintech loans. Junior tranche. Uncorrelated yield." },
  { symbol: "PARCL",  name: "Parcl Real Estate",    apy: null, category: "realestate",   riskLabel: "MED",   liquidity: "Immediate", tvl: "$28M",     description: "Synthetic real estate indices. NYC, Miami, London. NFT portfolio hedge." },
];

const RISK_COLORS: Record<string, string> = {
  LOW: "var(--green)", MED: "#f0d98a", HIGH: "#f26b6b",
};

// ─── Flight to Safety toggle ──────────────────────────────────────────────────
function FlightToSafety() {
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(15);

  return (
    <div style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#60A5FA" }}>⚡ Flight to Safety</span>
            <span style={{ fontSize: "0.6rem", padding: "0.08rem 0.4rem", borderRadius: "4px", background: enabled ? "rgba(20,241,149,0.1)" : "rgba(255,255,255,0.05)", color: enabled ? "#14F195" : "var(--subtle)", border: `1px solid ${enabled ? "rgba(20,241,149,0.2)" : "var(--line)"}` }}>
              {enabled ? "ACTIVE" : "OFF"}
            </span>
          </div>
          <p style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.5, maxWidth: "420px" }}>
            If NFT floor volatility exceeds <strong style={{ color: "var(--text)" }}>{threshold}%</strong>, agent automatically rotates vault capital into Ondo $USDY.
          </p>
        </div>
        <button
          onClick={() => setEnabled((v) => !v)}
          style={{ flexShrink: 0, background: enabled ? "rgba(20,241,149,0.1)" : "var(--surface)", border: `1px solid ${enabled ? "rgba(20,241,149,0.3)" : "var(--line)"}`, borderRadius: "8px", padding: "0.5rem 1rem", color: enabled ? "#14F195" : "var(--muted)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
          {enabled ? "Disable" : "Enable"}
        </button>
      </div>
      {enabled && (
        <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.65rem", color: "var(--subtle)" }}>Threshold:</span>
          <input type="range" min={5} max={30} value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value))}
            style={{ flex: 1, accentColor: "#60A5FA" }} />
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#60A5FA", minWidth: "30px" }}>{threshold}%</span>
        </div>
      )}
    </div>
  );
}

// ─── Asset card ───────────────────────────────────────────────────────────────
function AssetCard({ asset }: { asset: typeof ONDO_ASSETS[0] | typeof GROWTH_ASSETS[0] }) {
  const rc = RISK_COLORS[asset.riskLabel] ?? "var(--text)";
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "1rem 1.1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.15rem" }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", fontWeight: 700, color: "var(--gold)" }}>{asset.symbol}</span>
            <span style={{ fontSize: "0.56rem", padding: "0.06rem 0.35rem", borderRadius: "3px", background: `${rc}14`, color: rc, border: `1px solid ${rc}30`, fontWeight: 700, letterSpacing: "0.06em" }}>
              {asset.riskLabel}
            </span>
          </div>
          <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{asset.name}</div>
        </div>
        {asset.apy && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "#14F195" }}>{asset.apy}%</div>
            <div style={{ fontSize: "0.58rem", color: "var(--subtle)", textTransform: "uppercase" }}>APY</div>
          </div>
        )}
      </div>
      <p style={{ fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.5, marginBottom: "0.625rem" }}>{asset.description}</p>
      <div style={{ display: "flex", gap: "1rem", fontSize: "0.65rem", color: "var(--subtle)" }}>
        {'backing' in asset && <span>Backed by <span style={{ color: "var(--text)" }}>{(asset as typeof ONDO_ASSETS[0]).backing}</span></span>}
        <span>Liquidity: <span style={{ color: "var(--text)" }}>{asset.liquidity}</span></span>
        <span>TVL: <span style={{ color: "var(--text)" }}>{asset.tvl}</span></span>
      </div>
    </div>
  );
}

// ─── Total RWA value ──────────────────────────────────────────────────────────
function TotalRWAValue() {
  // Stub — aggregate from real positions when live
  const items = [
    { label: "Ondo Treasuries", value: "$0",   color: "var(--green)" },
    { label: "Collectibles",    value: "$0",   color: "#FBBF24"      },
    { label: "Private Credit",  value: "$0",   color: "#f0d98a"      },
    { label: "Real Estate",     value: "$0",   color: "#60A5FA"      },
  ];
  return (
    <div style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#FBBF24" }}>Real-World Net Worth</span>
        <span style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--text)" }}>$0.00</span>
      </div>
      <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
        {items.map((i) => (
          <div key={i.label} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: i.color }} />
            <span style={{ fontSize: "0.65rem", color: "var(--subtle)" }}>{i.label}: <span style={{ color: i.color, fontWeight: 600 }}>{i.value}</span></span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: "0.62rem", color: "var(--subtle)", marginTop: "0.5rem" }}>
        Connect positions to see live aggregate. Data from Ondo GM API + Helius webhooks.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RWAPage() {
  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1.25rem 2rem" }}>
      <p style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.4rem" }}>IP / RWA</p>
      <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(1.5rem,4vw,2.2rem)", letterSpacing: "-0.02em", marginBottom: "0.4rem" }}>
        Real-World Command Center
      </h1>
      <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "1.75rem" }}>
        Stability + Growth. Institutional yield meets high-velocity digital assets.
      </p>

      <TotalRWAValue />
      <FlightToSafety />

      {/* TOP ROW — Stability */}
      <div style={{ marginBottom: "0.875rem" }}>
        <p style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--green)", marginBottom: "0.625rem" }}>
          Stability layer — Ondo Finance
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: "0.625rem" }}>
          {ONDO_ASSETS.map((a) => <AssetCard key={a.symbol} asset={a} />)}
        </div>
        <p style={{ fontSize: "0.6rem", color: "var(--subtle)", marginTop: "0.5rem" }}>
          Data from Ondo GM API · Add <code style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.58rem" }}>ONDO_API_KEY</code> to Vercel for live yields
        </p>
      </div>

      {/* BOTTOM ROW — Growth */}
      <div style={{ marginTop: "1.5rem" }}>
        <p style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#FBBF24", marginBottom: "0.625rem" }}>
          Growth layer — High-beta assets
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: "0.625rem" }}>
          {GROWTH_ASSETS.map((a) => <AssetCard key={a.symbol} asset={a} />)}
        </div>
      </div>

      {/* Helius note */}
      <div style={{ marginTop: "2rem", padding: "0.875rem 1.1rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px" }}>
        <p style={{ fontSize: "0.68rem", color: "var(--muted)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--gold)" }}>Live integration:</strong> Register Helius webhooks for Ondo, Parcl, and Collector Crypt program IDs to trigger <code style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem", color: "var(--gold)" }}>/api/agent/tick</code> on yield distributions and new listings — zero polling, instant agent response.
        </p>
        <a href="https://dev.helius.xyz/webhooks/overview" target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.68rem", color: "var(--gold)", textDecoration: "none", marginTop: "0.4rem", display: "inline-block" }}>
          Helius webhook docs ↗
        </a>
      </div>
    </div>
  );
}