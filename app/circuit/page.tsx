// FILE: app/circuit/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { VAULTS } from "@/lib/appData";

interface SignalBreak {
  signal: string; value: number; threshold: number;
  breached: boolean; weight: number;
}
interface ActionTrigger {
  type: string; description: string; magnitude: number; urgent: boolean;
}
interface RiskResult {
  vaultId: string; score: number; state: string;
  signals: SignalBreak[]; action: ActionTrigger | null; evaluatedAt: string;
}

const STATE_COLORS: Record<string, string> = {
  LOW:      "var(--green)",
  MEDIUM:   "#f0d98a",
  HIGH:     "var(--gold)",
  CRITICAL: "#f26b6b",
};

const STATE_BG: Record<string, string> = {
  LOW:      "rgba(61,214,140,0.06)",
  MEDIUM:   "rgba(240,217,138,0.06)",
  HIGH:     "rgba(200,169,110,0.08)",
  CRITICAL: "rgba(242,107,107,0.08)",
};

function RiskBar({ score }: { score: number }) {
  const color = score >= 75 ? "#f26b6b" : score >= 50 ? "var(--gold)" : score >= 25 ? "#f0d98a" : "var(--green)";
  return (
    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "4px", height: "6px", width: "100%", overflow: "hidden" }}>
      <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: "4px", transition: "width 0.6s ease" }} />
    </div>
  );
}

export default function CircuitPage() {
  const [results, setResults]   = useState<RiskResult[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const load = () => {
    setLoading(true); setError(null);
    fetch("/api/circuit")
      .then((r) => r.json())
      .then((d) => {
        setResults(d.results ?? []);
        setLastUpdate(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000); // refresh every 30s
    return () => clearInterval(t);
  }, []);

  const critical  = results.filter((r) => r.state === "CRITICAL").length;
  const high      = results.filter((r) => r.state === "HIGH").length;
  const avgScore  = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  const triggered = results.filter((r) => r.action !== null).length;

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.25rem 4rem" }}>
      <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>Protocol</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "clamp(1.75rem,5vw,2.4rem)", letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
            Circuit Safety Engine
          </h1>
          {lastUpdate && <p style={{ fontSize: "0.62rem", color: "var(--subtle)" }}>Last evaluated: {lastUpdate} · auto-refresh 30s</p>}
        </div>
        <button onClick={load} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "6px", padding: "0.4rem 0.875rem", fontSize: "0.72rem", color: "var(--muted)", cursor: "pointer" }}>
          Evaluate now
        </button>
      </div>

      {/* System summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: "0.625rem", marginBottom: "1.75rem" }}>
        {[
          { k: "Avg risk score",    v: loading ? "…" : `${avgScore}/100`, warn: avgScore > 50 },
          { k: "Critical vaults",   v: loading ? "…" : String(critical),  crit: critical > 0  },
          { k: "High risk",         v: loading ? "…" : String(high),      warn: high > 0      },
          { k: "Actions triggered", v: loading ? "…" : String(triggered)                      },
        ].map((s) => (
          <div key={s.k} style={{ background: "var(--surface)", border: `1px solid ${(s as {crit?:boolean}).crit ? "rgba(242,107,107,0.3)" : "var(--line)"}`, borderRadius: "10px", padding: "0.875rem 1rem" }}>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: (s as {crit?:boolean}).crit ? "#f26b6b" : (s as {warn?:boolean}).warn ? "var(--gold)" : "var(--text)" }}>{s.v}</div>
            <div style={{ fontSize: "0.6rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "2px" }}>{s.k}</div>
          </div>
        ))}
      </div>

      {loading && !results.length && (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--subtle)" }}>Running circuit evaluation…</div>
      )}

      {error && (
        <div style={{ padding: "1rem", background: "rgba(242,107,107,0.06)", border: "1px solid rgba(242,107,107,0.2)", borderRadius: "10px", marginBottom: "1rem" }}>
          <p style={{ color: "#f26b6b", fontSize: "0.78rem" }}>{error}</p>
          <button onClick={load} style={{ marginTop: "0.5rem", background: "none", border: "none", color: "var(--gold)", fontSize: "0.72rem", cursor: "pointer" }}>Retry</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {results.map((r) => {
          const vault  = VAULTS.find((v) => v.id === r.vaultId);
          const isOpen = expanded === r.vaultId;
          const stateColor = STATE_COLORS[r.state] ?? "var(--text)";
          const stateBg    = STATE_BG[r.state]    ?? "transparent";

          return (
            <div key={r.vaultId} style={{ background: stateBg, border: `1px solid ${r.state !== "LOW" ? stateColor + "33" : "var(--line)"}`, borderRadius: "12px", overflow: "hidden" }}>
              <button
                onClick={() => setExpanded(isOpen ? null : r.vaultId)}
                style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "1.1rem 1.25rem", textAlign: "left" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{vault?.name ?? `VAULT-${r.vaultId}`}</span>
                    <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "0.12rem 0.5rem", borderRadius: "4px", background: `${stateColor}18`, color: stateColor, border: `1px solid ${stateColor}33` }}>
                      {r.state}
                    </span>
                    {r.action?.urgent && (
                      <span style={{ fontSize: "0.58rem", color: "#f26b6b", fontWeight: 700 }}>⚡ URGENT</span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.82rem", fontWeight: 700, color: stateColor }}>
                      {r.score}/100
                    </span>
                    <span style={{ fontSize: "0.68rem", color: "var(--subtle)" }}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                </div>
                <RiskBar score={r.score} />
                {r.action && (
                  <div style={{ marginTop: "0.625rem", fontSize: "0.72rem", color: "var(--gold)" }}>
                    ⚙ {r.action.description}
                  </div>
                )}
              </button>

              {/* Expanded signal breakdown */}
              {isOpen && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "1rem 1.25rem" }}>
                  <p style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.75rem" }}>Signal breakdown</p>
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    {r.signals.map((sig) => (
                      <div key={sig.signal} style={{ display: "grid", gridTemplateColumns: "140px 1fr auto", gap: "0.75rem", alignItems: "center" }}>
                        <span style={{ fontSize: "0.68rem", color: sig.breached ? "var(--gold)" : "var(--subtle)", fontFamily: "'JetBrains Mono', monospace" }}>
                          {sig.signal}
                        </span>
                        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "3px", height: "4px", overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(100, (sig.weight / 25) * 100)}%`, height: "100%", background: sig.breached ? "var(--gold)" : "var(--subtle)", borderRadius: "3px" }} />
                        </div>
                        <span style={{ fontSize: "0.68rem", color: sig.breached ? "var(--gold)" : "var(--muted)", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>
                          {sig.value.toFixed(2)} {sig.breached ? "⚠" : "✓"}
                        </span>
                      </div>
                    ))}
                  </div>
                  {r.action && (
                    <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "rgba(200,169,110,0.06)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "8px" }}>
                      <p style={{ fontSize: "0.62rem", color: "var(--gold)", fontWeight: 700, marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Action triggered: {r.action.type.replace("_", " ")}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{r.action.description}</p>
                      <p style={{ fontSize: "0.65rem", color: "var(--subtle)", marginTop: "0.25rem" }}>
                        Magnitude: {r.action.magnitude}% · {r.action.urgent ? "Urgent execution" : "Scheduled execution"}
                      </p>
                    </div>
                  )}
                  <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.875rem" }}>
                    <Link href={`/vault/${r.vaultId}`} style={{ fontSize: "0.72rem", color: "var(--gold)", textDecoration: "none" }}>View vault →</Link>
                    <Link href="/agents" style={{ fontSize: "0.72rem", color: "var(--muted)", textDecoration: "none" }}>View agent →</Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}