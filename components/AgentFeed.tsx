"use client";

import { mockAgentActions } from "@/lib/mockData";

export function AgentFeed() {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", overflow: "hidden" }}>
      <div style={{
        padding: "0.875rem 1.25rem",
        borderBottom: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--raise)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--green)", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
          <span style={{ fontWeight: 600, fontSize: "0.78rem", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text)" }}>
            Agent Activity
          </span>
        </div>
        <span style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)" }}>Live</span>
      </div>

      <div>
        {mockAgentActions.map((action, i) => (
          <div key={action.id} style={{
            padding: "0.75rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            fontSize: "0.75rem",
            borderBottom: i < mockAgentActions.length - 1 ? "1px solid var(--line)" : "none",
            background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
          }}>
            <span style={{ color: "var(--subtle)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.68rem", flexShrink: 0, width: "4rem" }}>
              {action.timestamp}
            </span>
            <span style={{ color: "var(--gold)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.68rem", flexShrink: 0 }}>
              AGENT-{action.agentId}
            </span>
            <span style={{ color: "var(--subtle)", flexShrink: 0, display: "none" }} className="sm:block">
              VAULT-{action.vaultId}
            </span>
            <span style={{ color: "var(--muted)", flex: 1 }}>{action.action}</span>
            {action.delta && (
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "0.68rem",
                flexShrink: 0,
                color: action.delta.startsWith("+") ? "var(--green)" : action.delta.startsWith("-") ? "var(--red)" : "var(--subtle)",
              }}>
                {action.delta}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
