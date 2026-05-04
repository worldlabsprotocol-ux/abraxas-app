// FILE: app/page.tsx
"use client";

import Link from "next/link";
import { TOTAL_AUM, ACTIVE_VAULTS, AGENTS_ONLINE, VAULTS, fmtUSD } from "@/lib/appData";
import { useCircuitState } from "@/lib/protocolStream";
import { PredictiveFeed } from "@/components/PredictiveFeed";
import { ProtocolConsole } from "@/components/ProtocolConsole";

function ProtocolHero() {
  const { state } = useCircuitState();
  const SC = {
    SAFE:  { text: "var(--green)", bg: "rgba(61,214,140,0.1)",  border: "rgba(61,214,140,0.25)"  },
    WATCH: { text: "#FBBF24",      bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.2)"   },
    RISK:  { text: "#f26b6b",      bg: "rgba(242,107,107,0.1)", border: "rgba(242,107,107,0.3)"  },
  }[state];

  return (
    <section style={{ maxWidth: "1080px", margin: "0 auto", padding: "1.5rem 1.25rem 1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "0.875rem", flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(1.3rem,3.5vw,1.875rem)", letterSpacing: "-0.02em", margin: 0 }}>
          Sovereign Intelligence
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.22rem 0.7rem", background: SC.bg, border: `1px solid ${SC.border}`, borderRadius: "100px" }}>
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: SC.text, animation: "pulse 1.4s ease-in-out infinite" }} />
          <span style={{ fontSize: "0.62rem", fontWeight: 700, color: SC.text, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Circuit {state}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
        {[
          { k: "AUM",    v: fmtUSD(TOTAL_AUM),    link: "/methodology" },
          { k: "Vaults", v: String(ACTIVE_VAULTS), link: "/marketplace" },
          { k: "Agents", v: String(AGENTS_ONLINE), link: "/agents"      },
          { k: "Losses", v: "$0",                  link: "/methodology", green: true },
        ].map((s) => (
          <Link key={s.k} href={s.link} style={{ textDecoration: "none" }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "8px", padding: "0.4rem 0.65rem", display: "flex", alignItems: "baseline", gap: "0.3rem" }}>
              <span style={{ fontWeight: 700, fontSize: "0.875rem", color: (s as {green?:boolean}).green ? "var(--green)" : "var(--text)" }}>{s.v}</span>
              <span style={{ fontSize: "0.55rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.k}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div style={{ background: "var(--void)", minHeight: "100vh" }}>
      <ProtocolHero />
      {/* PRIMARY: Predictive action feed */}
      <section style={{ maxWidth: "1080px", margin: "0 auto", padding: "0 1.25rem 1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,340px),1fr))", gap: "1rem", alignItems: "flex-start" }}>
          <PredictiveFeed />
          <ProtocolConsole />
        </div>
      </section>
      {/* SECONDARY: System vault strip */}
      <section style={{ maxWidth: "1080px", margin: "0 auto", padding: "0 1.25rem 2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
          <span style={{ fontSize: "0.57rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--subtle)" }}>System Vaults</span>
          <Link href="/marketplace" style={{ fontSize: "0.67rem", color: "var(--gold)", textDecoration: "none" }}>All →</Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: "0.4rem" }}>
          {VAULTS.map((v) => (
            <Link key={v.id} href={`/vault/${v.id}`} style={{ textDecoration: "none" }}>
              <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "9px", padding: "0.625rem 0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.15rem" }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", color: "var(--gold)" }}>{v.name}</span>
                  <span style={{ fontWeight: 700, fontSize: "0.78rem", color: "var(--green)" }}>{v.apy}%</span>
                </div>
                <div style={{ fontSize: "0.62rem", color: "var(--subtle)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.asset}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}