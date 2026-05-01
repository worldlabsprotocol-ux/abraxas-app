// FILE: app/page.tsx
"use client";

import Link from "next/link";
import { TOTAL_AUM, ACTIVE_VAULTS, AGENTS_ONLINE, ASSET_TYPES, fmtUSD } from "@/lib/appData";
import { LiveFeed } from "@/components/LiveFeed";

export default function HomePage() {
  return (
    <div style={{ background: "var(--void)", minHeight: "100vh" }}>

      {/* HERO — 5 seconds to understand */}
      <section style={{ maxWidth: "640px", margin: "0 auto", padding: "5rem 1.25rem 3rem", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(61,214,140,0.08)", border: "1px solid rgba(61,214,140,0.2)", borderRadius: "100px", padding: "0.3rem 0.75rem", marginBottom: "1.75rem" }}>
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize: "0.62rem", color: "var(--green)", fontWeight: 600 }}>{ACTIVE_VAULTS} vaults operating · Solana</span>
        </div>

        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 800,
          fontSize: "clamp(2rem, 7vw, 4rem)",
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          marginBottom: "1rem",
        }}>
          Operate your real-world<br />
          <span style={{
            background: "linear-gradient(135deg, #c8a96e 0%, #f0d98a 50%, #c8a96e 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            assets on Solana.
          </span>
        </h1>

        <p style={{ fontSize: "1rem", color: "var(--muted)", maxWidth: "440px", margin: "0 auto 2rem", lineHeight: 1.6 }}>
          Music royalties, real estate, and receivables — operated by autonomous agents.
        </p>

        <Link href="/onboard" style={{ textDecoration: "none" }}>
          <div style={{
            display: "inline-block",
            background: "var(--gold)", color: "var(--void)",
            borderRadius: "10px", padding: "1rem 2rem",
            fontWeight: 700, fontSize: "0.95rem",
            cursor: "pointer", marginBottom: "0.75rem",
            boxShadow: "0 4px 24px rgba(200,169,110,0.25)",
          }}>
            Start Operating →
          </div>
        </Link>
        <div>
          <Link href="/marketplace" style={{ fontSize: "0.78rem", color: "var(--muted)", textDecoration: "none" }}>
            or browse vaults
          </Link>
        </div>
      </section>

      {/* STATS — same numbers as everywhere else */}
      <section style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", background: "rgba(255,255,255,0.01)", padding: "1.5rem 1.25rem" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", textAlign: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.4rem", color: "var(--text)" }}>{fmtUSD(TOTAL_AUM)}</div>
            <div style={{ fontSize: "0.62rem", color: "var(--subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: "4px" }}>Total AUM</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.4rem", color: "var(--text)" }}>{ACTIVE_VAULTS}</div>
            <div style={{ fontSize: "0.62rem", color: "var(--subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: "4px" }}>Active Vaults</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.4rem", color: "var(--green)" }}>$0</div>
            <div style={{ fontSize: "0.62rem", color: "var(--subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: "4px" }}>Unrecovered</div>
          </div>
        </div>
      </section>

      {/* HOW — one line each */}
      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "3rem 1.25rem 2rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", textAlign: "center", marginBottom: "1.5rem" }}>How it works</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1px", background: "var(--line)" }}>
          {[
            { n: "1", title: "Pick asset",  desc: "Music, real estate, or receivables." },
            { n: "2", title: "Deposit",     desc: "Token-2022 minted to your wallet."  },
            { n: "3", title: "Agent runs",  desc: "Captures yield. Defends position."  },
          ].map((s) => (
            <div key={s.n} style={{ background: "var(--void)", padding: "1.5rem 1.25rem" }}>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: "1.5rem", color: "rgba(200,169,110,0.4)", marginBottom: "0.5rem" }}>{s.n}</div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.25rem" }}>{s.title}</div>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ASSETS — quick path to deposit */}
      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "1rem 1.25rem 2rem" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", textAlign: "center", marginBottom: "1.5rem" }}>What you can operate</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
          {ASSET_TYPES.map((a) => (
            <Link key={a.key} href={`/onboard?type=${a.key}`} style={{ textDecoration: "none" }}>
              <div style={{
                background: "var(--surface)", border: "1px solid var(--line)",
                borderRadius: "12px", padding: "1.25rem",
                cursor: "pointer", transition: "border 0.2s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>{a.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--green)" }}>{a.apy}%</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text)", marginBottom: "0.25rem" }}>{a.name}</div>
                <p style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.5 }}>{a.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* LIVE FEED — proves activity */}
      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
        <LiveFeed limit={10} />
      </section>
    </div>
  );
}
