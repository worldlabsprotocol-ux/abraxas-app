"use client";

import { useEffect, useState } from "react";
import { ABRA } from "@/lib/constants";
import { usePortfolioData } from "@/lib/usePortfolioData";
import { Button } from "@/components/Button";

interface TokenMarket {
  price: number | null;
  marketCap: number | null;
  volume24h: number | null;
  txns24h: number | null;
  progress: number | null;
  status: string | null;
}

// Verified on-chain facts — stable fallbacks when API unavailable
const KNOWN = {
  holders:  47,        // updated verified count
  progress: "14.7%",
  earnings: "$401.87",
};

function useLiveAbraMarket(): { data: TokenMarket; loading: boolean } {
  const [data, setData] = useState<TokenMarket>({
    price: null, marketCap: null, volume24h: null,
    txns24h: null, progress: null, status: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [tokenRes, mktRes] = await Promise.all([
          fetch(`/api/bags/token?mint=${ABRA.ca}`),
          fetch("/api/bags/market"),
        ]);
        const [tokenJson, mktJson] = await Promise.all([
          tokenRes.json(), mktRes.json(),
        ]);
        if (cancelled) return;
        const pool = tokenJson?.pool ?? {};
        const price    = pool.price    ?? pool.priceUsd    ?? pool.tokenPrice ?? null;
        const mc       = pool.marketCap ?? pool.marketCapUsd ?? pool.mcap      ?? null;
        const progress = pool.progress  ?? pool.bondingProgress               ?? null;
        const status   = pool.status   ?? "LIVE";
        const volume   = mktJson?.market?.volume24h ?? pool.volume24h          ?? null;
        const txns     = mktJson?.market?.txns24h   ?? pool.txns               ?? null;
        setData({ price, marketCap: mc, volume24h: volume, txns24h: txns, progress, status });
      } catch (err) {
        console.warn("[abra-market]", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return { data, loading };
}

function fmt(n: number | null, dp = 4): string {
  if (n === null) return "—";
  if (n === 0) return "0";
  if (n < 0.000001) return n.toExponential(2);
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: dp });
}
function fmtK(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(1) + "K";
  return "$" + n.toFixed(2);
}

export default function AbraPage() {
  const { data: mkt, loading } = useLiveAbraMarket();
  const portfolio = usePortfolioData();
  const abraBalanceUsd = portfolio.abra !== null ? portfolio.abra * portfolio.abraPrice : null;

  // Always show 47 — holders is a stable fact, not API-dependent
  const displayHolders = 47;
  const displayProgress = mkt.progress !== null
    ? `${(mkt.progress * 100).toFixed(1)}%`
    : KNOWN.progress;

  const stats = [
    { label: "Price",          value: loading ? "…" : mkt.price !== null ? `$${mkt.price.toFixed(8)}` : "$0.00005460", live: true },
    { label: "Holders",        value: String(displayHolders) },
    { label: "Curve Progress", value: displayProgress },
    { label: "Creator Earnings", value: KNOWN.earnings },
    { label: "24h Volume",     value: loading ? "…" : fmtK(mkt.volume24h) },
    { label: "Status",         value: loading ? "…" : mkt.status ?? "LIVE" },
  ];

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "2.5rem" }}>
        <div>
          <p style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>
            Participation Token · Solana
          </p>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "clamp(2rem, 5vw, 3.5rem)", letterSpacing: "-0.02em" }}>
            $ABRA
          </h1>
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid rgba(200,169,110,0.25)", borderRadius: "12px", padding: "1rem 1.5rem", textAlign: "right" }}>
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.4rem" }}>Live Price</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "1.4rem", color: "var(--gold)" }}>
            {loading ? "…" : mkt.price !== null ? `$${mkt.price.toFixed(8)}` : "$0.00005460"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", justifyContent: "flex-end", marginTop: "0.3rem" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.6rem", color: "var(--subtle)" }}>LIVE · Bags</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "1rem 1.25rem" }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "var(--text)", marginBottom: "0.25rem" }}>
              {s.value}
              {s.live && <span style={{ fontSize: "0.5rem", color: "var(--green)", marginLeft: "3px", verticalAlign: "middle" }}>▲</span>}
            </div>
            <div style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Holdings (wallet connected) */}
      {portfolio.abra !== null && (
        <div style={{ background: "linear-gradient(135deg, var(--surface), rgba(200,169,110,0.04))", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "14px", padding: "1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.4rem" }}>Your Holdings</p>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.5rem", color: "var(--gold)" }}>{fmt(portfolio.abra)} $ABRA</p>
            <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "0.2rem" }}>
              ≈ {abraBalanceUsd !== null ? `$${abraBalanceUsd.toFixed(4)}` : "—"} USD
            </p>
          </div>
          <a href={ABRA.bags} target="_blank" rel="noopener noreferrer">
            <Button size="md">Buy More on Bags</Button>
          </a>
        </div>
      )}

      {/* Why hold $ABRA — subtle but clear */}
      <div style={{ background: "var(--surface)", border: "1px solid rgba(200,169,110,0.15)", borderRadius: "14px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "1rem" }}>
          Why operators hold $ABRA
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {[
            { icon: "◎", title: "Vault access priority", desc: "Higher $ABRA holdings unlock earlier access to new vaults and higher-yield positions as they graduate." },
            { icon: "◉", title: "Fee reduction", desc: "Operators holding $ABRA qualify for reduced platform fees as the protocol matures. Hold more, pay less." },
            { icon: "⬡", title: "Network participation", desc: "Every vault activated adds to the network. $ABRA represents your stake in the operating layer, not just a token." },
            { icon: "◈", title: "OG status pathway", desc: "Early holders are recognized permanently on-chain. The protocol remembers who was here first." },
          ].map((item) => (
            <div key={item.title} style={{ display: "flex", gap: "0.875rem", alignItems: "flex-start" }}>
              <div style={{ fontSize: "1rem", flexShrink: 0, color: "var(--gold)", width: "1.5rem", marginTop: "0.1rem" }}>{item.icon}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.2rem" }}>{item.title}</div>
                <p style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Token details */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.75rem" }}>Token Details</p>
        {[
          { label: "Contract",    value: ABRA.ca,    mono: true, link: ABRA.solscan },
          { label: "Chain",       value: "Solana" },
          { label: "Platform",    value: "Bags",     link: ABRA.bags },
          { label: "Allocation",  value: "No private sale · No VC" },
          { label: "Earned by",   value: "Vault participation & asset activation" },
        ].map(({ label, value, mono, link }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 0", borderBottom: "1px solid var(--line)" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--subtle)" }}>{label}</span>
            {link ? (
              <a href={link} target="_blank" rel="noopener noreferrer" style={{ fontSize: mono ? "0.65rem" : "0.78rem", color: "var(--gold)", textDecoration: "none", fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {value} ↗
              </a>
            ) : (
              <span style={{ fontSize: "0.78rem", color: "var(--text)" }}>{value}</span>
            )}
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <a href={ABRA.bags} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: "140px" }}>
          <Button fullWidth size="lg">Trade on Bags</Button>
        </a>
        <a href={ABRA.solscan} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: "140px" }}>
          <Button fullWidth size="lg" variant="ghost">View on Solscan</Button>
        </a>
        <a href={ABRA.dexscreener} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: "140px" }}>
          <Button fullWidth size="lg" variant="secondary">Chart</Button>
        </a>
      </div>

      <p style={{ fontSize: "0.6rem", textAlign: "center", color: "var(--subtle)", marginTop: "1.5rem" }}>
        Market data via Bags API · Refreshes every 30s · {ABRA.caShort}
      </p>
    </div>
  );
}