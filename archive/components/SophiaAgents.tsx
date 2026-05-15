// FILE: components/SophiaAgents.tsx
// Sophia agent cards — first-class UI objects, always visible.
// Shows each agent's identity, assigned vault, strategy, and live state.
// Statically driven — no API call needed, uses agentEngine definitions.
"use client";

import Link from "next/link";
import { AGENTS } from "@/lib/agentEngine";
import { VAULTS } from "@/lib/appData";
import { useProtocolStream } from "@/lib/protocolStream";

const STRATEGY_LABELS: Record<string, string> = {
  yield_optimize: "Yield Optimize",
  rebalance:      "Rebalance",
  hedge:          "Hedge",
  circuit_guard:  "Circuit Guard",
};

// Derive apparent agent state from recent stream events
function useAgentLiveState(agentId: string): "monitoring" | "acting" | "idle" {
  const events = useProtocolStream(15);
  const agentNum = agentId.split("-")[1];
  const sophiaId = `[SOPHIA-${agentNum}]`;
  const recent   = events.filter((e) => e.source === sophiaId);
  if (recent.length > 0 && Date.now() - recent[0].ts < 30_000) return "acting";
  if (recent.length > 0) return "monitoring";
  return "monitoring";
}

function AgentCard({ agent }: { agent: typeof AGENTS[0] }) {
  const vault     = VAULTS.find((v) => v.id === agent.vaultId);
  const liveState = useAgentLiveState(agent.id);

  const stateColor = liveState === "acting" ? "var(--gold)" : "var(--green)";
  const stateBg    = liveState === "acting" ? "rgba(200,169,110,0.08)" : "rgba(61,214,140,0.06)";

  return (
    <div style={{
      background: stateBg,
      border: `1px solid ${liveState === "acting" ? "rgba(200,169,110,0.25)" : "var(--line)"}`,
      borderRadius: "10px", padding: "0.875rem 1rem",
      transition: "all 0.4s",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.15rem" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: stateColor, animation: liveState === "acting" ? "pulse 0.8s ease-in-out infinite" : "pulse 3s ease-in-out infinite" }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.68rem", color: "var(--gold)" }}>{agent.id}</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{agent.name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: stateColor }}>{liveState}</div>
          <div style={{ fontSize: "0.58rem", color: "var(--subtle)", marginTop: "1px" }}>{agent.actionsToday} actions</div>
        </div>
      </div>

      {/* Vault + Strategy */}
      <div style={{ fontSize: "0.68rem", color: "var(--subtle)", marginBottom: "0.35rem" }}>
        {vault?.name} · {STRATEGY_LABELS[agent.strategy] ?? agent.strategy}
      </div>

      {/* Last action */}
      <div style={{ fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.4, marginBottom: "0.5rem" }}>
        {agent.lastAction}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.62rem", color: "var(--subtle)" }}>
          {vault ? `${vault.apy}% APY · ${vault.asset}` : ""}
        </span>
        <Link href={`/agents`} style={{ fontSize: "0.62rem", color: "var(--gold)", textDecoration: "none" }}>
          Trace →
        </Link>
      </div>
    </div>
  );
}

interface Props { compact?: boolean }

export function SophiaAgents({ compact = false }: Props) {
  const displayed = compact ? AGENTS.slice(0, 3) : AGENTS;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.875rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--subtle)" }}>
            Sophia Agents
          </span>
          <span style={{ fontSize: "0.58rem", padding: "0.1rem 0.4rem", borderRadius: "3px", background: "rgba(61,214,140,0.08)", color: "var(--green)", border: "1px solid rgba(61,214,140,0.2)" }}>
            {AGENTS.length} active
          </span>
        </div>
        <Link href="/agents" style={{ fontSize: "0.68rem", color: "var(--gold)", textDecoration: "none" }}>
          All agents →
        </Link>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.625rem" }}>
        {displayed.map((a) => <AgentCard key={a.id} agent={a} />)}
      </div>
    </div>
  );
}