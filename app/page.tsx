"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { HomeStatsBar } from "@/components/HomeStatsBar";
import { RevenuePanel } from "@/components/RevenuePanel";
import { ABRA } from "@/lib/constants";
import { VAULT_YIELD_RATES } from "@/lib/usePortfolioData";

const TRACKS = [
  {
    key: "music", icon: "♪",
    title: "Music & IP",
    tagline: "Your catalog is sleeping capital.",
    desc: "Agent captures royalty distributions, optimizes licensing, defends against streaming platform risk.",
    apy: VAULT_YIELD_RATES["490"], vaultId: "490", listType: "music",
    color: "rgba(200,169,110,0.08)", border: "rgba(200,169,110,0.25)",
  },
  {
    key: "realestate", icon: "◻",
    title: "Real Estate",
    tagline: "Rent flows idle. Agents don't.",
    desc: "Agent captures rent flows, hedges vacancy, reinvests at the right time automatically.",
    apy: VAULT_YIELD_RATES["492"], vaultId: "492", listType: "realestate",
    color: "rgba(107,140,255,0.06)", border: "rgba(107,140,255,0.2)",
  },
  {
    key: "receivables", icon: "◈",
    title: "Receivables",
    tagline: "Outstanding invoices are capital.",
    desc: "Agent scores counterparty risk, finances receivables, rotates on credit drops.",
    apy: VAULT_YIELD_RATES["493"], vaultId: "493", listType: "receivables",
    color: "rgba(61,214,140,0.05)", border: "rgba(61,214,140,0.18)",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{ background: "var(--void)" }}>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "5rem 1.5rem 3rem",
        position: "relative", overflow: "hidden",
      }}>
        {/* Orbital rings */}
        <div style={{ position: "absolute", width: "600px", height: "600px", borderRadius: "50%", border: "1px solid rgba(200,169,110,0.06)", top: "50%", left: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: "900px", height: "900px", borderRadius: "50%", border: "1px solid rgba(107,140,255,0.03)", top: "50%", left: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: "500px", height: "300px", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(200,169,110,0.07) 0%, transparent 70%)", top: "30%", left: "50%", transform: "translate(-50%, -50%)", filter: "blur(40px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "200px", background: "linear-gradient(to bottom, transparent, var(--void))", pointerEvents: "none" }} />

        <div style={{ maxWidth: "800px", position: "relative", zIndex: 2 }}>
          {/* Phase markers */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "2rem", marginBottom: "3rem" }}>
            {[{ n: "I", label: "Passive" }, { n: "II", label: "Programmable" }, { n: "III", label: "Autonomous", active: true }].map((p) => (
              <div key={p.n} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: p.active ? "1.5rem" : "1rem", color: p.active ? "var(--gold)" : "var(--subtle)", fontStyle: "italic" }}>{p.n}</div>
                <div style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: p.active ? "var(--gold)" : "var(--subtle)", marginTop: "2px" }}>{p.label}</div>
                {p.active && <div style={{ width: "100%", height: "1px", background: "var(--gold)", marginTop: "4px", boxShadow: "0 0 8px var(--gold)" }} />}
              </div>
            ))}
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "clamp(2.5rem, 6vw, 5rem)", lineHeight: 1.02, letterSpacing: "-0.02em", color: "var(--text)", marginBottom: "1.25rem" }}>
            Real-world assets<br />
            <span style={{ background: "linear-gradient(135deg, #c8a96e 0%, #e8c98e 50%, #c8a96e 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              stop being held.
            </span>
          </h1>

          <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: "1.2rem", fontStyle: "italic", color: "var(--muted)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
            They start being operated.
          </p>

          <p style={{ fontSize: "0.875rem", color: "var(--subtle)", lineHeight: 1.7, maxWidth: "460px", margin: "0 auto 2.5rem" }}>
            Autonomous agents manage capital inside named vaults, defended by real-time circuit protection, settling on Solana.
          </p>

          {/* Primary CTA */}
          <div style={{ display: "flex", gap: "0.875rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "4rem" }}>
            <Link href="/onboard"><Button size="lg">Start Operating →</Button></Link>
            <Link href="/marketplace"><Button size="lg" variant="ghost">Browse Vaults</Button></Link>
          </div>

          {/* ── INLINE TRACK SELECTOR ── */}
          <div style={{ textAlign: "left" }}>
            <p style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", textAlign: "center", marginBottom: "1.25rem" }}>
              What do you want to operate?
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
              {TRACKS.map((t) => (
                <div
                  key={t.key}
                  onClick={() => router.push(`/list?type=${t.listType}`)}
                  onMouseEnter={() => setHovered(t.key)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    background: hovered === t.key ? t.color : "rgba(255,255,255,0.02)",
                    border: `1px solid ${hovered === t.key ? t.border : "rgba(255,255,255,0.07)"}`,
                    borderRadius: "12px", padding: "1.25rem",
                    cursor: "pointer", transition: "all 0.2s",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "1.25rem" }}>{t.icon}</span>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--green)" }}>{t.apy}%</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.2rem" }}>{t.title}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.5 }}>{t.tagline}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────── */}
      <section style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", background: "var(--deep)", padding: "1.5rem" }}>
        <HomeStatsBar />
      </section>

      {/* ── LIVE REVENUE ─────────────────────────────────── */}
      <section style={{ borderBottom: "1px solid var(--line)", background: "rgba(200,169,110,0.02)", padding: "0 1.5rem" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <RevenuePanel compact />
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "6rem 1.5rem" }}>
        <div style={{ marginBottom: "3rem" }}>
          <div style={{ fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "1rem" }}>Architecture</div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "clamp(1.5rem, 3vw, 2.25rem)", letterSpacing: "-0.01em" }}>
            You define the strategy.
            <span style={{ color: "var(--muted)", fontWeight: 300 }}> Agents operate it.</span>
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1px", background: "var(--line)" }}>
          {[
            { n: "01", title: "Register", desc: "Submit your asset — catalog, deed, or invoice. Agent is assigned immediately.", icon: "◈" },
            { n: "02", title: "Activate",  desc: "Your agent takes over. Continuous. Always-on. You become the architect.", icon: "⬡" },
            { n: "03", title: "Compound",  desc: "Yield captured and reinvested. Every action logged publicly in real time.", icon: "◎" },
            { n: "04", title: "Defend",    desc: "Risk thresholds crossed: defense executes. Position protected automatically.", icon: "◉" },
          ].map((s) => (
            <div key={s.n} style={{ background: "var(--deep)", padding: "2.5rem 2rem", transition: "background 0.2s" }} className="hover:bg-surface">
              <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: "3rem", color: "var(--subtle)", fontStyle: "italic", marginBottom: "1rem", lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>{s.icon}</div>
              <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.4rem", color: "var(--text)" }}>{s.title}</div>
              <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.65 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CLOSING CTA ──────────────────────────────────── */}
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem 8rem" }}>
        <div style={{ background: "var(--deep)", border: "1px solid var(--line)", borderRadius: "20px", padding: "5rem 3rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(200,169,110,0.06), transparent)", pointerEvents: "none" }} />
          <p style={{ fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "1.5rem" }}>
            Every vault adds data. Every action sharpens execution.
          </p>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "clamp(1.5rem, 3vw, 2.25rem)", marginBottom: "1.25rem", lineHeight: 1.15 }}>
            Every operator strengthens the network.
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--muted)", maxWidth: "420px", margin: "0 auto 2.5rem", lineHeight: 1.7 }}>
            Real assets become operated capital. Abraxas is the layer between ownership and yield.
          </p>
          <div style={{ display: "flex", gap: "0.875rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/onboard"><Button size="lg">Start Operating</Button></Link>
            <Link href="/formations"><Button size="lg" variant="ghost">Form an Entity</Button></Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid var(--line)", padding: "1.25rem", textAlign: "center", background: "var(--deep)" }}>
        <p style={{ fontSize: "0.7rem", color: "var(--subtle)", letterSpacing: "0.05em" }}>
          {ABRA.ticker} &nbsp;·&nbsp; Solana &nbsp;·&nbsp;{" "}
          <a href={ABRA.solscan} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", textDecoration: "none", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem" }}>{ABRA.caShort}</a>
          &nbsp;·&nbsp;
          <a href={ABRA.bags} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", textDecoration: "none" }}>Trade on Bags</a>
          &nbsp;·&nbsp;
          <a href={ABRA.dexscreener} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", textDecoration: "none" }}>Chart</a>
        </p>
      </div>
    </div>
  );
}