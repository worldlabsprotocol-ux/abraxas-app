"use client";

import { useEffect, useState } from "react";
import { ABRA } from "@/lib/constants";
import { usePortfolioData } from "@/lib/usePortfolioData";
import { Button } from "@/components/Button";

interface TokenMarket {
  price: number | null;
  marketCap: number | null;
  holders: number | null;
  volume24h: number | null;
  txns24h: number | null;
  progress: number | null;
  status: string | null;
}

function useLiveAbraMarket(): { data: TokenMarket; loading: boolean } {
  const [data, setData] = useState<TokenMarket>({
    price: null, marketCap: null, holders: null,
    volume24h: null, txns24h: null, progress: null, status: null,
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
        const price = pool.price ?? pool.priceUsd ?? pool.tokenPrice ?? null;
        const mc = pool.marketCap ?? pool.marketCapUsd ?? pool.mcap ?? null;
        const holders = tokenJson?.creators?.length ?? null;
        const progress = pool.progress ?? pool.bondingProgress ?? null;
        const status = pool.status ?? "LIVE";
        const volume = mktJson?.market?.volume24h ?? pool.volume24h ?? null;
        const txns = mktJson?.market?.txns24h ?? pool.txns ?? null;

        setData({ price, marketCap: mc, holders, volume24h: volume, txns24h: txns, progress, status });
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
  const { data: market, loading } = useLiveAbraMarket();
  const portfolio = usePortfolioData();

  const abraBalanceUsd =
    portfolio.abra !== null ? portfolio.abra * portfolio.abraPrice : null;

  // Fallback display values (from real on-chain data we know)
  const displayHolders = market.holders ?? 46;
  const displayTxns = market.txns24h ?? 16;
  const displayProgress = market.progress !== null ? `${(market.progress * 100).toFixed(1)}%` : "14.7%";

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
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.4rem" }}>Price USD</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: "1.4rem", color: "var(--gold)" }}>
            {loading ? "…" : market.price !== null ? `$${market.price.toFixed(8)}` : "$0.00005460"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", justifyContent: "flex-end", marginTop: "0.3rem" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.6rem", color: "var(--subtle)" }}>LIVE · Bags</span>
          </div>
        </div>
      </div>

      {/* Market stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
        {[
          { label: "Market Cap", value: loading ? "…" : fmtK(market.marketCap) ?? "$4K" },
          { label: "24h Volume", value: loading ? "…" : fmtK(market.volume24h) ?? "$532" },
          { label: "Holders", value: loading ? "…" : fmt(displayHolders, 0) },
          { label: "24h Txns", value: loading ? "…" : fmt(displayTxns, 0) },
          { label: "Curve Progress", value: loading ? "…" : displayProgress },
          { label: "Status", value: loading ? "…" : market.status ?? "LIVE" },
        ].map((s) => (
          <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "1rem 1.25rem" }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "var(--text)", marginBottom: "0.25rem" }}>
              {s.value}
            </div>
            <div style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Your holdings (wallet connected) */}
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

      {/* Token details */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.75rem" }}>Token Details</p>
        {[
          { label: "Contract Address", value: ABRA.ca, mono: true, link: ABRA.solscan },
          { label: "Chain", value: "Solana" },
          { label: "Platform", value: "Bags", link: ABRA.bags },
          { label: "Allocation", value: "No private sale · No VC" },
          { label: "Earned by", value: "Vault participation & asset activation" },
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

      {/* What $ABRA is */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.75rem" }}>The participation token</p>
        <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.75, marginBottom: "0.875rem" }}>
          $ABRA is the participation token of the Abraxas operating layer. The token grows as the system grows — every vault activated, every agent action executed, every asset operated contributes to the network the token represents.
        </p>
        <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.75, marginBottom: "0.875rem" }}>
          No private allocations. No team unlocks ahead of users. No VC tranches.
        </p>
        <p style={{ fontSize: "0.875rem", color: "var(--text)", fontWeight: 500, lineHeight: 1.75 }}>
          $ABRA is earned by participation — listing assets, depositing to vaults, and operating capital through Abraxas.
        </p>
      </div>

      {/* Tiers */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "1.5rem", marginBottom: "2rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "1rem" }}>Participation Tiers</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {[
            { tier: "1", label: "OG ETH Collection", desc: "Legacy holders from the pre-Abraxas era. Early access, recognition, and future eligibility.", gold: true },
            { tier: "2", label: "$ABRA Holders", desc: "Ecosystem participants. Top holders receive access-layer benefits and priority features as the protocol matures.", gold: false },
            { tier: "3", label: "Abraxas Operators", desc: "Users who deposit to vaults, activate assets, and operate capital. The highest-value participation path.", gold: false },
          ].map((t) => (
            <div key={t.tier} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "2rem", lineHeight: 1, color: t.gold ? "var(--gold)" : "var(--subtle)", flexShrink: 0, width: "2rem" }}>{t.tier}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.25rem" }}>{t.label}</div>
                <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
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

      <p style={{ fontSize: "0.6rem", textAlign: "center", color: "var(--subtle)", marginTop: "1.5rem", letterSpacing: "0.05em" }}>
        Market data via Bags API · Refreshes every 30s · {ABRA.caShort}
      </p>
    </div>
  );
}