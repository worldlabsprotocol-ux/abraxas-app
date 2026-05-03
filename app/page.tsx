// FILE: app/page.tsx
"use client";

import Link from "next/link";
import { TOTAL_AUM, ACTIVE_VAULTS, AGENTS_ONLINE, VAULTS, fmtUSD } from "@/lib/appData";
import { useCircuitState, useProtocolStream } from "@/lib/protocolStream";
import { ProtocolConsole } from "@/components/ProtocolConsole";

function ProtocolHero() {
  const { state } = useCircuitState();
  const events    = useProtocolStream(5);
  const alerts    = events.filter((e) => e.severity === "alert").length;
  const warns     = events.filter((e) => e.severity === "warn").length;
  const SC = {
    SAFE:  { text: "var(--green)", bg: "rgba(61,214,140,0.1)",  border: "rgba(61,214,140,0.25)"  },
    WATCH: { text: "#f0d98a",      bg: "rgba(240,217,138,0.08)", border: "rgba(240,217,138,0.2)"  },
    RISK:  { text: "var(--gold)",  bg: "rgba(200,169,110,0.1)",  border: "rgba(200,169,110,0.3)"  },
  }[state];

  return (
    <section style={{ maxWidth: "1080px", margin: "0 auto", padding: "1.75rem 1.25rem 1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(1.4rem,4vw,2rem)", letterSpacing: "-0.02em", margin: 0 }}>
          Abraxas Protocol
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.22rem 0.7rem", background: SC.bg, border: `1px solid ${SC.border}`, borderRadius: "100px", flexShrink: 0 }}>
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: SC.text, animation: "pulse 1.4s ease-in-out infinite" }} />
          <span style={{ fontSize: "0.62rem", fontWeight: 700, color: SC.text, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Circuit {state}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {[
          { k: "AUM",       v: fmtUSD(TOTAL_AUM),     link: "/methodology" },
          { k: "Vaults",    v: String(ACTIVE_VAULTS),  link: "/marketplace" },
          { k: "Agents",    v: String(AGENTS_ONLINE),  link: "/agents"      },
          { k: "Alerts",    v: String(alerts + warns),  link: "/circuit", warn: (alerts + warns) > 0 },
          { k: "Recovered", v: "$0",                   link: "/methodology", green: true },
        ].map((s) => (
          <Link key={s.k} href={s.link} style={{ textDecoration: "none" }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "8px", padding: "0.45rem 0.7rem", display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
              <span style={{ fontWeight: 700, fontSize: "0.88rem", color: (s as {green?:boolean}).green ? "var(--green)" : (s as {warn?:boolean}).warn && (alerts+warns) > 0 ? "var(--gold)" : "var(--text)" }}>{s.v}</span>
              <span style={{ fontSize: "0.56rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.k}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// Vault strip — secondary
function VaultStrip() {
  return (
    <section style={{ maxWidth: "1080px", margin: "0 auto", padding: "2rem 1.25rem 3rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--subtle)" }}>System Vaults</span>
        <Link href="/marketplace" style={{ fontSize: "0.68rem", color: "var(--gold)", textDecoration: "none" }}>All vaults →</Link>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px,1fr))", gap: "0.45rem" }}>
        {VAULTS.map((v) => (
          <Link key={v.id} href={`/vault/${v.id}`} style={{ textDecoration: "none" }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "9px", padding: "0.65rem 0.8rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem", color: "var(--gold)" }}>{v.name}</span>
                <span style={{ fontWeight: 700, fontSize: "0.78rem", color: "var(--green)" }}>{v.apy}%</span>
              </div>
              <div style={{ fontSize: "0.64rem", color: "var(--subtle)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.asset}</div>
              <div style={{ fontSize: "0.64rem", color: "var(--muted)", marginTop: "0.15rem" }}>{fmtUSD(v.tvl)}</div>
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
      {/* PRIMARY — Interactive protocol console */}
      <section style={{ maxWidth: "1080px", margin: "0 auto", padding: "0 1.25rem 1rem" }}>
        <ProtocolConsole />
      </section>
      {/* SECONDARY — System vaults */}
      <VaultStrip />
    </div>
  );
}