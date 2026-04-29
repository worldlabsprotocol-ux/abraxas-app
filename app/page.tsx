"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { HomeStatsBar } from "@/components/HomeStatsBar";
import { AgentFeed } from "@/components/AgentFeed";
import { ABRA } from "@/lib/constants";
import { VAULT_YIELD_RATES } from "@/lib/usePortfolioData";

const TRACKS = [
  { key: "music",       icon: "♪", label: "Music IP",    apy: VAULT_YIELD_RATES["490"], color: "rgba(200,169,110,0.15)", border: "rgba(200,169,110,0.4)",  href: "/list?type=music"       },
  { key: "realestate",  icon: "◻", label: "Real Estate", apy: VAULT_YIELD_RATES["492"], color: "rgba(107,140,255,0.12)", border: "rgba(107,140,255,0.35)", href: "/list?type=realestate"  },
  { key: "receivables", icon: "◈", label: "Receivables", apy: VAULT_YIELD_RATES["493"], color: "rgba(61,214,140,0.08)",  border: "rgba(61,214,140,0.3)",   href: "/list?type=receivables" },
];

function useLiveCounter(start: number, interval = 5000) {
  const [v, setV] = useState(start);
  useEffect(() => {
    const t = setInterval(() => setV((n) => n + Math.floor(Math.random() * 2) + 1), interval);
    return () => clearInterval(t);
  }, [start, interval]);
  return v;
}

export default function HomePage() {
  const router = useRouter();
  const actions = useLiveCounter(18185);
  const [hov, setHov] = useState<string | null>(null);

  return (
    <div style={{ background: "var(--void)", minHeight: "100vh" }}>

      {/* ── HERO — short, punchy, above the fold ── */}
      <section style={{
        minHeight: "calc(100vh - 60px)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "4rem 1.5rem 2rem",
        position: "relative", overflow: "hidden", textAlign: "center",
      }}>
        {/* Background atmosphere */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(200,169,110,0.08), transparent 60%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: "700px", height: "700px", borderRadius: "50%", border: "1px solid rgba(200,169,110,0.05)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: "400px", height: "400px", borderRadius: "50%", border: "1px solid rgba(200,169,110,0.08)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 2, maxWidth: "680px" }}>
          {/* Status pill */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(61,214,140,0.08)", border: "1px solid rgba(61,214,140,0.2)", borderRadius: "100px", padding: "0.35rem 0.875rem", marginBottom: "2rem" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.68rem", color: "var(--green)", fontWeight: 600, letterSpacing: "0.06em" }}>
              {actions.toLocaleString()} agent actions · 5 vaults operating
            </span>
          </div>

          {/* Headline — ruthlessly short */}
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 800,
            fontSize: "clamp(2.75rem, 7vw, 5.5rem)",
            lineHeight: 1,
            letterSpacing: "-0.03em",
            marginBottom: "1.25rem",
          }}>
            <span style={{ color: "var(--text)" }}>Your assets.</span><br />
            <span style={{
              background: "linear-gradient(135deg, #c8a96e 0%, #f0d98a 45%, #c8a96e 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>Operated.</span>
          </h1>

          <p style={{ fontSize: "1rem", color: "var(--muted)", lineHeight: 1.65, marginBottom: "2.5rem", maxWidth: "440px", margin: "0 auto 2.5rem" }}>
            Autonomous agents turn idle real-world assets into compounding yield — on Solana.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "3rem" }}>
            <Link href="/onboard">
              <div style={{ background: "var(--gold)", color: "var(--void)", borderRadius: "8px", padding: "0.75rem 2rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", letterSpacing: "0.04em" }}>
                Start Operating
              </div>
            </Link>
            <Link href="/marketplace">
              <div style={{ background: "transparent", color: "var(--text)", border: "1px solid var(--line)", borderRadius: "8px", padding: "0.75rem 2rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: "0.875rem", cursor: "pointer" }}>
                Browse Vaults
              </div>
            </Link>
          </div>

          {/* Asset track selector — 3 tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.625rem", maxWidth: "500px", margin: "0 auto" }}>
            {TRACKS.map((t) => (
              <div
                key={t.key}
                onClick={() => router.push(t.href)}
                onMouseEnter={() => setHov(t.key)}
                onMouseLeave={() => setHov(null)}
                style={{
                  background: hov === t.key ? t.color : "rgba(255,255,255,0.02)",
                  border: `1px solid ${hov === t.key ? t.border : "rgba(255,255,255,0.07)"}`,
                  borderRadius: "10px", padding: "1rem 0.75rem",
                  cursor: "pointer", transition: "all 0.2s",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "1.25rem", marginBottom: "0.3rem" }}>{t.icon}</div>
                <div style={{ fontSize: "0.7rem", fontWeight: 600, marginBottom: "0.15rem" }}>{t.label}</div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--green)" }}>{t.apy}%</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", background: "rgba(255,255,255,0.01)", padding: "1.25rem 1.5rem" }}>
        <HomeStatsBar />
      </div>

      {/* ── HOW IT WORKS — 4 cells, visual grid ── */}
      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "5rem 1.5rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--subtle)", textAlign: "center", marginBottom: "3rem" }}>
          How it works
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1px", background: "var(--line)" }} className="sm:grid-cols-4">
          {[
            { n: "01", icon: "◈", title: "Register",  desc: "Submit your asset in 3 minutes. Catalog, deed, or invoice." },
            { n: "02", icon: "⬡", title: "Agent on",  desc: "An autonomous agent is assigned. Always watching, always executing." },
            { n: "03", icon: "◎", title: "Compounds", desc: "Yield captured and reinvested automatically. Logged on-chain." },
            { n: "04", icon: "◉", title: "Defended",  desc: "Risk threshold crossed? Defense executes before losses occur." },
          ].map((s) => (
            <div key={s.n} style={{ background: "var(--void)", padding: "2.5rem 1.75rem" }}>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: "2.5rem", color: "rgba(200,169,110,0.2)", lineHeight: 1, marginBottom: "0.75rem" }}>{s.n}</div>
              <div style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>{s.icon}</div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.4rem" }}>{s.title}</div>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── LIVE FEED — agent actions scrolling ── */}
      <section style={{ borderTop: "1px solid var(--line)", padding: "0 1.5rem 5rem" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "1.5rem 0 1.25rem" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--subtle)" }}>
              Live — agent activity
            </span>
          </div>
          <AgentFeed compact />
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section style={{ borderTop: "1px solid var(--line)", padding: "4rem 1.5rem" }}>
        <div style={{ maxWidth: "500px", margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "clamp(1.25rem, 3vw, 1.75rem)", marginBottom: "1rem", lineHeight: 1.2 }}>
            Your catalog has been sleeping.<br />
            <span style={{ color: "var(--gold)" }}>Time to operate.</span>
          </p>
          <p style={{ fontSize: "0.82rem", color: "var(--subtle)", marginBottom: "2rem" }}>
            $ABRA · {ABRA.caShort} · Solana
          </p>
          <Link href="/onboard">
            <div style={{ display: "inline-block", background: "var(--gold)", color: "var(--void)", borderRadius: "8px", padding: "0.875rem 2.5rem", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}>
              Get Started →
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}