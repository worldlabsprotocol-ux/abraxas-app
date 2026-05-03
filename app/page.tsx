// FILE: app/page.tsx
// Protocol interface homepage.
// UI hierarchy: System status → Circuit feed → Sophia agents → Vaults
// Not a dashboard. A guardian protocol interface.
"use client";

import Link from "next/link";
import { TOTAL_AUM, ACTIVE_VAULTS, AGENTS_ONLINE, VAULTS, fmtUSD } from "@/lib/appData";
import { useCircuitState } from "@/lib/protocolStream";
import { CircuitEventStream } from "@/components/CircuitEventStream";
import { SophiaAgents } from "@/components/SophiaAgents";

// ─── Vault status strip — secondary, supports the main narrative ──────────────
function VaultStrip() {
  return (
    <section style={{ maxWidth: "1080px", margin: "0 auto", padding: "0 1.25rem 3rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.875rem" }}>
        <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--subtle)" }}>
          Managed Vaults
        </span>
        <Link href="/marketplace" style={{ fontSize: "0.68rem", color: "var(--gold)", textDecoration: "none" }}>
          All vaults →
        </Link>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: "0.5rem" }}>
        {VAULTS.map((v) => (
          <Link key={v.id} href={`/vault/${v.id}`} style={{ textDecoration: "none" }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", padding: "0.75rem 0.875rem", cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.35rem" }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: "var(--gold)" }}>{v.name}</span>
                <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--green)" }}>{v.apy}%</span>
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--subtle)", marginBottom: "0.25rem" }}>{v.asset}</div>
              <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>{fmtUSD(v.tvl)} TVL</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.5rem" }}>
                <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: v.status === "operating" ? "var(--green)" : "#f0d98a" }} />
                <span style={{ fontSize: "0.58rem", color: v.status === "operating" ? "var(--green)" : "#f0d98a", textTransform: "uppercase", letterSpacing: "0.06em" }}>{v.status}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── Protocol hero — minimal, confidence-projecting ──────────────────────────
function ProtocolHero() {
  const { state } = useCircuitState();
  const stateColors = {
    SAFE:  "var(--green)",
    WATCH: "#f0d98a",
    RISK:  "var(--gold)",
  };
  const stateColor = stateColors[state];

  return (
    <section style={{ maxWidth: "1080px", margin: "0 auto", padding: "2rem 1.25rem 2.5rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "clamp(1.5rem, 4vw, 2.2rem)", letterSpacing: "-0.02em", margin: 0 }}>
            Abraxas Protocol
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.2rem 0.6rem", background: `${stateColor}14`, border: `1px solid ${stateColor}33`, borderRadius: "100px" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: stateColor, animation: "pulse 1.5s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.62rem", fontWeight: 700, color: stateColor, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Circuit {state}
            </span>
          </div>
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--muted)", margin: 0 }}>
          Autonomous AI agents protecting tokenized real-world assets on Solana.
        </p>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
          {[
            { k: "Total AUM",      v: fmtUSD(TOTAL_AUM)          },
            { k: "Active Vaults",  v: String(ACTIVE_VAULTS)      },
            { k: "Sophia Agents",  v: String(AGENTS_ONLINE)      },
            { k: "Unrecovered",    v: "$0", green: true          },
          ].map((s) => (
            <div key={s.k} style={{ display: "flex", gap: "0.35rem", alignItems: "baseline" }}>
              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: (s as {green?:boolean}).green ? "var(--green)" : "var(--text)" }}>{s.v}</span>
              <span style={{ fontSize: "0.62rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.k}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Homepage — protocol interface ───────────────────────────────────────────
export default function HomePage() {
  return (
    <div style={{ background: "var(--void)", minHeight: "100vh" }}>

      {/* Protocol identity + live state */}
      <ProtocolHero />

      {/* PRIMARY — Circuit feed + Sophia agents side by side on wide, stacked on mobile */}
      <section style={{ maxWidth: "1080px", margin: "0 auto", padding: "0 1.25rem 2.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.25rem", alignItems: "flex-start" }}>
          {/* Left: Circuit event stream — main storytelling layer */}
          <div>
            <CircuitEventStream limit={18} />
          </div>
          {/* Right: Sophia agent cards — first-class objects */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <SophiaAgents compact />
            {/* Quick actions */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", padding: "1rem" }}>
              <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.625rem" }}>Protocol actions</p>
              {[
                { href: "/operate",  label: "Deploy capital",    sub: "Open a vault position"      },
                { href: "/circuit",  label: "Circuit monitor",   sub: "Full risk engine view"      },
                { href: "/agents",   label: "Agent console",     sub: "Sophia decision traces"     },
                { href: "/dashboard",label: "Your positions",    sub: "Active vault positions"     },
              ].map((a) => (
                <Link key={a.href} href={a.href} style={{ textDecoration: "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}>
                    <div>
                      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)" }}>{a.label}</div>
                      <div style={{ fontSize: "0.65rem", color: "var(--subtle)" }}>{a.sub}</div>
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "var(--gold)" }}>→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECONDARY — Vault strip */}
      <VaultStrip />
    </div>
  );
}