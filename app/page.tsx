"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { HomeStatsBar } from "@/components/HomeStatsBar";
import { AgentFeed } from "@/components/AgentFeed";
import { MarketFeed } from "@/components/MarketFeed";
import { ABRA } from "@/lib/constants";
import { VAULT_YIELD_RATES } from "@/lib/usePortfolioData";
import { usePortfolioData } from "@/lib/usePortfolioData";
import { formatCurrency } from "@/lib/utils";

const TRACKS = [
  { key: "music",       icon: "♪", label: "Music IP",    apy: VAULT_YIELD_RATES["490"], color: "rgba(200,169,110,0.1)", border: "rgba(200,169,110,0.35)", href: "/list?type=music"       },
  { key: "realestate",  icon: "◻", label: "Real Estate", apy: VAULT_YIELD_RATES["492"], color: "rgba(107,140,255,0.1)", border: "rgba(107,140,255,0.3)",  href: "/list?type=realestate"  },
  { key: "receivables", icon: "◈", label: "Receivables", apy: VAULT_YIELD_RATES["493"], color: "rgba(61,214,140,0.07)", border: "rgba(61,214,140,0.25)",  href: "/list?type=receivables" },
];

function useTicker(base: number, interval = 5500) {
  const [v, setV] = useState(base);
  useEffect(() => {
    const t = setInterval(() => setV((n) => n + Math.floor(Math.random() * 2) + 1), interval);
    return () => clearInterval(t);
  }, [interval]);
  return v;
}

export default function HomePage() {
  const router = useRouter();
  const portfolio = usePortfolioData();
  const actions = useTicker(18185);
  const [hov, setHov] = useState<string | null>(null);

  return (
    <div style={{ background: "var(--void)" }}>

      {/* ── AUM TICKER — very top, always visible ── */}
      <div style={{
        borderBottom: "1px solid rgba(200,169,110,0.1)",
        background: "rgba(200,169,110,0.03)",
        padding: "0.5rem 1.25rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "0.5rem",
        fontSize: "0.68rem",
        overflowX: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", whiteSpace: "nowrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ color: "var(--subtle)", letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.6rem" }}>Total AUM</span>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "var(--gold)" }}>
              {portfolio.loading ? "…" : formatCurrency(portfolio.systemAUM)}
            </span>
          </div>
          <span style={{ color: "var(--line)" }}>|</span>
          <span style={{ color: "var(--subtle)" }}>
            <span style={{ color: "var(--text)", fontWeight: 600 }}>{actions.toLocaleString()}</span> agent actions
          </span>
          <span style={{ color: "var(--line)" }}>|</span>
          <span style={{ color: "var(--subtle)" }}>
            <span style={{ color: "var(--green)", fontWeight: 600 }}>$0</span> unrecovered
          </span>
        </div>
        <a href={ABRA.bags} target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "var(--gold)", textDecoration: "none", whiteSpace: "nowrap" }}>
          $ABRA {ABRA.caShort} ↗
        </a>
      </div>

      {/* ── HERO — mobile first, punchy ── */}
      <section style={{
        padding: "clamp(3rem, 8vw, 6rem) 1.25rem 3rem",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background atmosphere */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(200,169,110,0.07), transparent 55%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: "min(600px, 100vw)", height: "min(600px, 100vw)", borderRadius: "50%", border: "1px solid rgba(200,169,110,0.05)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 2, maxWidth: "640px", margin: "0 auto" }}>
          {/* Live status pill */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(61,214,140,0.08)", border: "1px solid rgba(61,214,140,0.2)", borderRadius: "100px", padding: "0.3rem 0.75rem", marginBottom: "1.75rem" }}>
            <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.62rem", color: "var(--green)", fontWeight: 600, letterSpacing: "0.05em" }}>
              5 vaults operating · Solana mainnet
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "clamp(2.25rem, 8vw, 5rem)", lineHeight: 1.0, letterSpacing: "-0.03em", marginBottom: "1rem" }}>
            <span style={{ color: "var(--text)" }}>Your assets.</span><br />
            <span style={{ background: "linear-gradient(135deg, #c8a96e 0%, #f0d98a 45%, #c8a96e 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Operated.
            </span>
          </h1>

          <p style={{ fontSize: "clamp(0.875rem, 2.5vw, 1rem)", color: "var(--muted)", lineHeight: 1.65, marginBottom: "2rem", maxWidth: "400px", margin: "0 auto 2rem" }}>
            Autonomous agents turn idle real-world assets into compounding yield — on Solana.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "2.5rem" }}>
            <Link href="/onboard">
              <div style={{ background: "var(--gold)", color: "var(--void)", borderRadius: "8px", padding: "0.75rem 1.75rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", letterSpacing: "0.03em", whiteSpace: "nowrap" }}>
                Start Operating
              </div>
            </Link>
            <Link href="/marketplace">
              <div style={{ background: "transparent", color: "var(--text)", border: "1px solid var(--line)", borderRadius: "8px", padding: "0.75rem 1.75rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: "0.875rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                Browse Vaults
              </div>
            </Link>
          </div>

          {/* Asset tiles — 3 cols, mobile friendly */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", maxWidth: "420px", margin: "0 auto" }}>
            {TRACKS.map((t) => (
              <div
                key={t.key}
                onClick={() => router.push(t.href)}
                onMouseEnter={() => setHov(t.key)}
                onMouseLeave={() => setHov(null)}
                style={{ background: hov === t.key ? t.color : "rgba(255,255,255,0.02)", border: `1px solid ${hov === t.key ? t.border : "rgba(255,255,255,0.07)"}`, borderRadius: "10px", padding: "0.875rem 0.5rem", cursor: "pointer", transition: "all 0.2s", textAlign: "center" }}
              >
                <div style={{ fontSize: "1.1rem", marginBottom: "0.3rem" }}>{t.icon}</div>
                <div style={{ fontSize: "0.65rem", fontWeight: 600, marginBottom: "0.15rem", letterSpacing: "0.02em" }}>{t.label}</div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--green)" }}>{t.apy}%</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", background: "rgba(255,255,255,0.01)", padding: "1.25rem" }}>
        <HomeStatsBar />
      </div>

      {/* ── MARKET INTELLIGENCE — Jeff Yan: context before conversion ── */}
      <section style={{ padding: "3rem 1.25rem" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)" }}>
              Market Intelligence
            </span>
            <span style={{ fontSize: "0.6rem", color: "var(--subtle)" }}>·</span>
            <span style={{ fontSize: "0.6rem", color: "var(--muted)" }}>Music IP · Real Estate · RWA</span>
          </div>
          <MarketFeed />
        </div>
      </section>

      {/* ── HOW IT WORKS — visual, minimal words ── */}
      <section style={{ borderTop: "1px solid var(--line)", padding: "3rem 1.25rem" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", textAlign: "center", marginBottom: "2rem" }}>
            How it works
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1px", background: "var(--line)" }} className="sm:grid-cols-4">
            {[
              { n: "01", icon: "◈", title: "Register",  desc: "3 minutes. Catalog, deed, or invoice." },
              { n: "02", icon: "⬡", title: "Agent on",  desc: "Autonomous. Always executing." },
              { n: "03", icon: "◎", title: "Compounds", desc: "Yield captured. Reinvested. On-chain." },
              { n: "04", icon: "◉", title: "Defended",  desc: "Risk crossed? Defense executes first." },
            ].map((s) => (
              <div key={s.n} style={{ background: "var(--void)", padding: "2rem 1.5rem" }}>
                <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: "2rem", color: "rgba(200,169,110,0.18)", lineHeight: 1, marginBottom: "0.75rem" }}>{s.n}</div>
                <div style={{ fontSize: "0.9rem", marginBottom: "0.4rem" }}>{s.icon}</div>
                <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.3rem" }}>{s.title}</div>
                <p style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.55 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE AGENT FEED ── */}
      <section style={{ borderTop: "1px solid var(--line)", padding: "2.5rem 1.25rem" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--subtle)" }}>
              Live — agent activity
            </span>
          </div>
          <AgentFeed compact />
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ borderTop: "1px solid var(--line)", padding: "3.5rem 1.25rem 5rem" }}>
        <div style={{ maxWidth: "420px", margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "clamp(1.2rem, 4vw, 1.6rem)", marginBottom: "0.875rem", lineHeight: 1.2 }}>
            Your catalog has been sleeping.<br />
            <span style={{ color: "var(--gold)" }}>Time to operate.</span>
          </p>
          <Link href="/onboard">
            <div style={{ display: "inline-block", background: "var(--gold)", color: "var(--void)", borderRadius: "8px", padding: "0.875rem 2.25rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}>
              Get Started →
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}