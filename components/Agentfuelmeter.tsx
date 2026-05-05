// FILE: components/AgentFuelMeter.tsx
// x402 agent fuel display. Shows USDC balance + spent + top-up CTA.
// Pulses red when low fuel. Attaches to any agent card.
"use client";

import { useAgentFuel, topUpAgent, OPERATION_COSTS } from "@/lib/x402/agentFuel";

export function AgentFuelMeter({ agentId }: { agentId: string }) {
  const wallet = useAgentFuel(agentId);
  const pct    = Math.min(100, (wallet.balanceUsdc / 5.0) * 100);
  const color  = wallet.lowFuel ? "#f26b6b" : pct > 50 ? "#14F195" : "#FBBF24";

  return (
    <div style={{ padding: "0.5rem 0.625rem", background: wallet.lowFuel ? "rgba(242,107,107,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${wallet.lowFuel ? "rgba(242,107,107,0.25)" : "var(--line)"}`, borderRadius: "7px", transition: "all 0.3s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ fontSize: "0.56rem", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono',monospace", animation: wallet.lowFuel ? "pulse 0.8s ease-in-out infinite" : "none" }}>
            x402 Fuel
          </span>
          <span style={{ fontSize: "0.54rem", color: "var(--subtle)" }}>
            ${wallet.balanceUsdc.toFixed(4)} USDC
          </span>
        </div>
        {wallet.lowFuel && (
          <button onClick={() => topUpAgent(agentId)} style={{ background: "rgba(242,107,107,0.15)", border: "1px solid rgba(242,107,107,0.3)", borderRadius: "4px", padding: "0.1rem 0.4rem", fontSize: "0.54rem", color: "#f26b6b", cursor: "pointer", fontWeight: 700 }}>
            Top Up →
          </button>
        )}
        {!wallet.lowFuel && (
          <span style={{ fontSize: "0.54rem", color: "var(--subtle)" }}>
            {wallet.txCount} ops · ${wallet.spent.toFixed(4)} spent
          </span>
        )}
      </div>
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "3px", height: "3px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "3px", transition: "width 0.4s ease" }} />
      </div>
      {wallet.lowFuel && (
        <p style={{ fontSize: "0.56rem", color: "#f26b6b", marginTop: "0.2rem" }}>
          Low fuel — agent operations paused until topped up
        </p>
      )}
    </div>
  );
}