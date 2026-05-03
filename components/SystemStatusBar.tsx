// FILE: components/SystemStatusBar.tsx
// Persistent protocol status bar — always visible below the Nav.
// Shows: Circuit state, active agents, vault count, system pulse.
// Client component — reads from protocolStream.
"use client";

import { useCircuitState } from "@/lib/protocolStream";
import { AGENTS_ONLINE, ACTIVE_VAULTS } from "@/lib/appData";
import Link from "next/link";

const STATE_COLORS = {
  SAFE:  { text: "var(--green)", bg: "rgba(61,214,140,0.08)",  border: "rgba(61,214,140,0.2)"  },
  WATCH: { text: "#f0d98a",      bg: "rgba(240,217,138,0.08)", border: "rgba(240,217,138,0.2)" },
  RISK:  { text: "var(--gold)",  bg: "rgba(200,169,110,0.1)",  border: "rgba(200,169,110,0.25)" },
};

export function SystemStatusBar() {
  const { state, pulse } = useCircuitState();
  const c = STATE_COLORS[state];

  return (
    <div style={{
      position: "fixed", top: "56px", left: 0, right: 0, zIndex: 48,
      height: "36px",
      background: "rgba(2,3,10,0.97)",
      borderBottom: `1px solid ${c.border}`,
      display: "flex", alignItems: "center",
      padding: "0 1rem", gap: "1.5rem",
      backdropFilter: "blur(12px)",
      overflowX: "auto",
    }}>
      {/* Circuit state */}
      <Link href="/circuit" style={{ textDecoration: "none", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: c.text,
            animation: pulse ? "pulse 1.2s ease-in-out infinite" : "none",
          }} />
          <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: c.text }}>
            CIRCUIT {state}
          </span>
        </div>
      </Link>

      <div style={{ width: "1px", height: "16px", background: "var(--line)", flexShrink: 0 }} />

      {/* Agents */}
      <Link href="/agents" style={{ textDecoration: "none", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)" }} />
          <span style={{ fontSize: "0.6rem", color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {AGENTS_ONLINE} Sophia Agents
          </span>
        </div>
      </Link>

      <div style={{ width: "1px", height: "16px", background: "var(--line)", flexShrink: 0 }} />

      {/* Vaults */}
      <div style={{ flexShrink: 0 }}>
        <span style={{ fontSize: "0.6rem", color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {ACTIVE_VAULTS} Vaults
        </span>
      </div>

      <div style={{ width: "1px", height: "16px", background: "var(--line)", flexShrink: 0 }} />

      {/* Protocol pulse */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
        <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
        <span style={{ fontSize: "0.6rem", color: "var(--subtle)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Protocol Online
        </span>
      </div>

      {/* Uptime — right aligned */}
      <div style={{ marginLeft: "auto", flexShrink: 0 }}>
        <span style={{ fontSize: "0.58rem", color: "var(--subtle)", fontFamily: "'JetBrains Mono', monospace" }}>
          $0 unrecovered · 99.97% uptime
        </span>
      </div>
    </div>
  );
}