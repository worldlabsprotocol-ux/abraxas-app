// FILE: app/vault/[id]/page.tsx
// Vault execution unit view — shows agent, circuit state, event stream, on-chain proof.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { VAULTS, fmtUSD } from "@/lib/appData";
import { AGENTS } from "@/lib/agentEngine";
import { useProtocolStream } from "@/lib/protocolStream";

// Vault-scoped event stream — filters global stream by vaultId
function VaultEventStream({ vaultId }: { vaultId: string }) {
  const all     = useProtocolStream(60);
  const events  = all.filter((e) => !e.vaultId || e.vaultId === vaultId).slice(0, 12);
  const TYPE    = { circuit_detect: "#f0d98a", defense: "#f26b6b", agent_act: "var(--green)", vault_update: "var(--gold)", system: "var(--subtle)" };

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ padding: "0.7rem 1.1rem", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 1.5s ease-in-out infinite" }} />
        <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Vault Event Log</span>
      </div>
      <div>
        {events.map((e) => (
          <div key={e.id} style={{ display: "grid", gridTemplateColumns: "8px 1fr auto", gap: "0.625rem", alignItems: "flex-start", padding: "0.55rem 1.1rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ display: "block", width: "6px", height: "6px", borderRadius: "50%", background: TYPE[e.type] ?? "var(--subtle)", marginTop: "4px" }} />
            <div>
              <span style={{ fontSize: "0.62rem", fontFamily: "'JetBrains Mono', monospace", color: "var(--subtle)", marginRight: "0.4rem" }}>{e.source}</span>
              <span style={{ fontSize: "0.75rem", color: e.severity === "alert" ? "#f26b6b" : e.severity === "warn" ? "#f0d98a" : "var(--muted)" }}>{e.message}</span>
            </div>
            <span style={{ fontSize: "0.58rem", color: "var(--subtle)", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>
              {Math.max(1, Math.floor((Date.now() - e.ts) / 1000))}s
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Agent panel for this vault
function AgentPanel({ vaultId, agentId }: { vaultId: string; agentId: string }) {
  const [data, setData]       = useState<{ agent: Record<string, unknown>; decisions: Record<string, unknown>[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/agents?vaultId=${vaultId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [vaultId]);

  const STRATEGY_LABELS: Record<string, string> = {
    yield_optimize: "Yield Optimize",
    rebalance:      "Rebalance",
    hedge:          "Hedge",
    circuit_guard:  "Circuit Guard",
  };

  return (
    <div style={{ background: "rgba(61,214,140,0.04)", border: "1px solid rgba(61,214,140,0.15)", borderRadius: "12px", padding: "1.1rem 1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.625rem" }}>
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--green)", animation: "pulse 2s ease-in-out infinite" }} />
        <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--green)" }}>
          Assigned Agent
        </span>
      </div>
      {loading ? (
        <p style={{ fontSize: "0.75rem", color: "var(--subtle)" }}>Loading agent state…</p>
      ) : data?.agent ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.68rem", color: "var(--gold)", marginBottom: "2px" }}>
                {String(data.agent.id ?? agentId)}
              </div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{String(data.agent.name ?? "Sophia")}</div>
            </div>
            <div style={{ fontSize: "0.62rem", color: "var(--green)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {String(data.agent.status ?? "active")}
            </div>
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--subtle)", marginBottom: "0.35rem" }}>
            {STRATEGY_LABELS[String(data.agent.strategy ?? "")] ?? String(data.agent.strategy ?? "")} strategy · {String(data.agent.actionsToday ?? 0)} actions today
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
            {String(data.agent.lastAction ?? "")}
          </div>
          {/* Decision trace — show firing rules */}
          {(data.decisions as Array<Record<string,unknown>>).filter((d) => d.fired).length > 0 && (
            <div style={{ borderTop: "1px solid rgba(61,214,140,0.12)", paddingTop: "0.625rem" }}>
              <p style={{ fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--subtle)", marginBottom: "0.4rem" }}>
                Active rules
              </p>
              {(data.decisions as Array<Record<string,unknown>>).filter((d) => d.fired).map((d) => (
                <div key={String(d.rule)} style={{ fontSize: "0.68rem", color: "#f0d98a", marginBottom: "0.2rem" }}>
                  ⚡ {String(d.action ?? "")}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p style={{ fontSize: "0.75rem", color: "var(--subtle)" }}>No agent data.</p>
      )}
      <Link href="/agents" style={{ display: "inline-block", marginTop: "0.625rem", fontSize: "0.68rem", color: "var(--gold)", textDecoration: "none" }}>
        Full agent trace →
      </Link>
    </div>
  );
}

// Circuit risk panel for this vault
function CircuitPanel({ vaultId }: { vaultId: string }) {
  const [data, setData]       = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/circuit?vaultId=${vaultId}`)
      .then((r) => r.json())
      .then((d) => { setData(d.result ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [vaultId]);

  const STATE_COLORS: Record<string, string> = {
    LOW: "var(--green)", MEDIUM: "#f0d98a", HIGH: "var(--gold)", CRITICAL: "#f26b6b",
  };
  const score   = Number(data?.score ?? 0);
  const state   = String(data?.state ?? "LOW");
  const color   = STATE_COLORS[state] ?? "var(--green)";

  return (
    <div style={{ background: "var(--surface)", border: `1px solid ${color}22`, borderRadius: "12px", padding: "1.1rem 1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
        <div>
          <div style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--subtle)", marginBottom: "0.35rem" }}>
            Circuit Risk
          </div>
          {loading ? (
            <div style={{ fontSize: "0.75rem", color: "var(--subtle)" }}>Evaluating…</div>
          ) : (
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
              <span style={{ fontWeight: 800, fontSize: "1.4rem", color }}>{score}</span>
              <span style={{ fontSize: "0.65rem", color: "var(--subtle)" }}>/100</span>
              <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "0.12rem 0.5rem", borderRadius: "4px", background: `${color}18`, color, border: `1px solid ${color}33`, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {state}
              </span>
            </div>
          )}
        </div>
        <Link href="/circuit" style={{ fontSize: "0.68rem", color: "var(--gold)", textDecoration: "none" }}>
          Full view →
        </Link>
      </div>
      {/* Risk bar */}
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "4px", height: "5px", overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: "4px", transition: "width 0.6s ease" }} />
      </div>
      {!!data?.action && (
        <div style={{ marginTop: "0.625rem", fontSize: "0.7rem", color: "var(--gold)" }}>
          ⚙ {String((data?.action as Record<string,unknown>)?.description ?? "")}
        </div>
      )}
    </div>
  );
}

export default function VaultDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const v      = VAULTS.find((x) => x.id === params.id);
  const agent  = AGENTS.find((a) => a.vaultId === params.id);

  if (!v) {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "4rem 1.25rem", textAlign: "center" }}>
        <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>Vault not found.</p>
        <Link href="/marketplace" style={{ color: "var(--gold)" }}>Browse vaults →</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.25rem 4rem" }}>
      <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--subtle)", fontSize: "0.75rem", cursor: "pointer", marginBottom: "1.25rem" }}>
        ← Back
      </button>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.3rem" }}>Vault · Protocol Execution Unit</p>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "clamp(1.75rem, 5vw, 2.4rem)", letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
            {v.name}
          </h1>
          <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{v.asset} · {v.agent}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 800, fontSize: "1.8rem", color: "var(--green)" }}>{v.apy}%</div>
          <div style={{ fontSize: "0.6rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.08em" }}>APY</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.625rem", marginBottom: "1.5rem" }}>
        {[
          { k: "TVL",         v: fmtUSD(v.tvl)                          },
          { k: "Inception",   v: v.inceptionDate                        },
          { k: "Status",      v: v.status,  green: v.status === "operating" },
          { k: "Unrecovered", v: "$0",      green: true                 },
        ].map((s) => (
          <div key={s.k} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", padding: "0.875rem 1rem" }}>
            <div style={{ fontSize: "0.58rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.2rem" }}>{s.k}</div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: (s as {green?:boolean}).green ? "var(--green)" : "var(--text)", textTransform: s.k === "Status" ? "capitalize" : "none" }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Two column: agent + circuit */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
        {agent && <AgentPanel vaultId={v.id} agentId={agent.id} />}
        <CircuitPanel vaultId={v.id} />
      </div>

      {/* On-chain proof */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
        <p style={{ fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.4rem" }}>
          Vault wallet · On-chain
        </p>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.68rem", color: "var(--gold)", wordBreak: "break-all", marginBottom: "0.4rem" }}>
          {v.walletAddress}
        </div>
        <a href={v.solscanUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.7rem", color: "var(--gold)", textDecoration: "none" }}>
          View on Solscan ↗
        </a>
      </div>

      {/* Deploy CTA */}
      <Link href={`/deposit/${v.id}`} style={{ textDecoration: "none" }}>
        <button style={{ width: "100%", background: "var(--gold)", color: "var(--void)", border: "none", borderRadius: "10px", padding: "1rem", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", marginBottom: "1.5rem" }}>
          Deploy Capital →
        </button>
      </Link>

      {/* Vault event log */}
      <VaultEventStream vaultId={v.id} />
    </div>
  );
}