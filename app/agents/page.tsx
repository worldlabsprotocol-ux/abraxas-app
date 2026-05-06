// FILE: app/agents/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fmtUSD, VAULTS } from "@/lib/appData";
import { SovereignBriefing } from "@/components/SovereignBriefing";

interface AgentDef {
  id: string; name: string; vaultId: string; strategy: string;
  status: string; assignedAt: string; lastAction: string;
  actionsToday: number; description: string;
}
interface AgentDecision {
  agentId: string; rule: string; input: number; threshold: number;
  fired: boolean; action: string; rationale: string;
}
interface AgentRow { agent: AgentDef; decisions: AgentDecision[] }

const STRATEGY_LABELS: Record<string, string> = {
  yield_optimize: "Yield Optimize",
  rebalance:      "Rebalance",
  hedge:          "Hedge",
  circuit_guard:  "Circuit Guard",
};

const STATUS_COLORS: Record<string, string> = {
  active:     "var(--green)",
  paused:     "#f0d98a",
  evaluating: "var(--gold)",
  executing:  "var(--gold)",
};

export default function AgentsPage() {
  const [data, setData]       = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch("/api/agents")
      .then((r) => r.json())
      .then((d) => { setData(d.agents ?? []); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const totalActions = data.reduce((s, d) => s + d.agent.actionsToday, 0);
  const activeCount  = data.filter((d) => d.agent.status === "active").length;
  const firedCount   = data.reduce((s, d) => s + d.decisions.filter((x) => x.fired).length, 0);

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.25rem 4rem" }}>
      <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>Protocol</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "clamp(1.75rem,5vw,2.4rem)", letterSpacing: "-0.02em" }}>
          Sophia Agents
        </h1>
        <button onClick={load} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "6px", padding: "0.4rem 0.875rem", fontSize: "0.72rem", color: "var(--muted)", cursor: "pointer" }}>
          Refresh
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: "0.625rem", marginBottom: "1.75rem" }}>
        {[
          { k: "Agents online",    v: String(activeCount)   },
          { k: "Actions today",    v: String(totalActions)  },
          { k: "Rules firing",     v: String(firedCount),   g: firedCount > 0 },
          { k: "Strategy types",   v: "4"                   },
        ].map((s) => (
          <div key={s.k} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", padding: "0.875rem 1rem" }}>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: s.g ? "var(--gold)" : "var(--text)" }}>{s.v}</div>
            <div style={{ fontSize: "0.6rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2px" }}>{s.k}</div>
          </div>
        ))}
      </div>

      {loading && (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--subtle)" }}>
          Evaluating agents…
        </div>
      )}

      {error && (
        <div style={{ padding: "1rem", background: "rgba(242,107,107,0.06)", border: "1px solid rgba(242,107,107,0.2)", borderRadius: "10px", marginBottom: "1rem" }}>
          <p style={{ color: "#f26b6b", fontSize: "0.78rem" }}>{error}</p>
          <button onClick={load} style={{ marginTop: "0.5rem", background: "none", border: "none", color: "var(--gold)", fontSize: "0.72rem", cursor: "pointer" }}>Retry</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {data.map(({ agent, decisions }) => {
          const vault   = VAULTS.find((v) => v.id === agent.vaultId);
          const isOpen  = expanded === agent.id;
          const firing  = decisions.filter((d) => d.fired);

          return (
            <div key={agent.id} style={{ background: "var(--surface)", border: `1px solid ${firing.length > 0 ? "rgba(200,169,110,0.3)" : "var(--line)"}`, borderRadius: "12px", overflow: "hidden" }}>
              {/* Agent header */}
              <button
                onClick={() => setExpanded(isOpen ? null : agent.id)}
                style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "1.1rem 1.25rem", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: "var(--gold)" }}>{agent.id}</span>
                    <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>{agent.name}</span>
                    <span style={{ fontSize: "0.62rem", padding: "0.1rem 0.45rem", borderRadius: "4px", background: "rgba(61,214,140,0.08)", color: STATUS_COLORS[agent.status] ?? "var(--text)", border: `1px solid ${STATUS_COLORS[agent.status] ?? "var(--line)"}20` }}>
                      {agent.status}
                    </span>
                    {firing.length > 0 && (
                      <span style={{ fontSize: "0.62rem", padding: "0.1rem 0.45rem", borderRadius: "4px", background: "rgba(200,169,110,0.1)", color: "var(--gold)", border: "1px solid rgba(200,169,110,0.25)" }}>
                        {firing.length} rule{firing.length > 1 ? "s" : ""} firing
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--subtle)" }}>
                    {STRATEGY_LABELS[agent.strategy] ?? agent.strategy} · {vault?.name} · {agent.actionsToday} actions today
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                    Last: {agent.lastAction}
                  </div>
                </div>
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                  {vault && <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--green)" }}>{vault.apy}%</div>}
                  <span style={{ fontSize: "0.68rem", color: "var(--subtle)" }}>{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>

              {/* Expanded — decision trace */}
              {isOpen && (
                <div style={{ borderTop: "1px solid var(--line)", padding: "1rem 1.25rem" }}>
                  <p style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.75rem" }}>
                    Decision trace · {agent.description}
                  </p>
                  {decisions.map((d) => (
                    <div key={d.rule} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.625rem", alignItems: "flex-start", padding: "0.625rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: d.fired ? "var(--gold)" : "var(--subtle)", marginTop: "4px", flexShrink: 0 }} />
                      <div>
                        <div style={{ display: "flex", gap: "0.625rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.2rem" }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: "var(--gold)" }}>{d.rule}</span>
                          <span style={{ fontSize: "0.65rem", color: d.fired ? "var(--gold)" : "var(--subtle)" }}>
                            input {d.input.toFixed(2)} vs threshold {d.threshold}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: d.fired ? "var(--text)" : "var(--muted)", marginBottom: "0.15rem" }}>{d.action}</div>
                        <div style={{ fontSize: "0.68rem", color: "var(--subtle)" }}>{d.rationale}</div>
                      </div>
                    </div>
                  ))}
                  <Link href={`/vault/${agent.vaultId}`} style={{ display: "inline-block", marginTop: "0.75rem", fontSize: "0.72rem", color: "var(--gold)", textDecoration: "none" }}>
                    View vault →
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Sovereign Briefing — Orbis-gated, requires vault position */}
      <div style={{ marginTop: "2rem" }}>
        <SovereignBriefing />
      </div>
    </div>
  );
}