// FILE: app/protect/page.tsx
// Vaults tab — the core product surface.
// Every vault shows state, agent, circuit status, last Helius event.
// Every vault has operational controls: activate, trigger, simulate.
"use client";

import { useState, useEffect } from "react";
import {
  useSystemState, SystemVault, VaultState, CircuitState, AgentRole,
  activateProtection, triggerCircuit, simulateHeliusEvent, createSystemVault,
} from "@/lib/systemState";
import { ASSET_TYPES } from "@/lib/appData";

// ─── State colors ─────────────────────────────────────────────────────────────
const STATE_CONFIG: Record<VaultState, { color: string; bg: string; border: string; label: string }> = {
  UNPROTECTED:       { color: "#FBBF24",   bg: "rgba(251,191,36,0.06)",   border: "rgba(251,191,36,0.2)",   label: "Unprotected"       },
  PROTECTED:         { color: "#14F195",   bg: "rgba(20,241,149,0.06)",   border: "rgba(20,241,149,0.2)",   label: "Protected"         },
  AT_RISK:           { color: "var(--gold)", bg: "rgba(200,169,110,0.08)", border: "rgba(200,169,110,0.25)", label: "At Risk"           },
  CIRCUIT_TRIGGERED: { color: "#f26b6b",   bg: "rgba(242,107,107,0.08)", border: "rgba(242,107,107,0.25)", label: "Circuit Triggered" },
};
const CIRCUIT_CONFIG: Record<CircuitState, { color: string; label: string }> = {
  INACTIVE:  { color: "var(--subtle)", label: "Inactive"  },
  ACTIVE:    { color: "#14F195",       label: "Active"    },
  TRIGGERED: { color: "#f26b6b",       label: "Triggered" },
};
const AGENT_LABELS: Record<AgentRole, string> = {
  hedge:          "Hedge",
  rebalance:      "Rebalance",
  yield_optimize: "Yield Optimize",
  circuit_guard:  "Circuit Guard",
};

// ─── Vault card ───────────────────────────────────────────────────────────────
function VaultCard({ vault }: { vault: SystemVault }) {
  const [activating, setActivating] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [showActivate, setShowActivate] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState("Quick Protect (Recommended)");
  const [selectedAgent, setSelectedAgent]   = useState<AgentRole>("hedge");

  const sc = STATE_CONFIG[vault.state];
  const cc = CIRCUIT_CONFIG[vault.circuitState];
  const ago = (ts: number) => { const s = Math.max(1, Math.floor((Date.now()-ts)/1000)); return s < 60 ? `${s}s` : `${Math.floor(s/60)}m`; };

  const handleActivate = async () => {
    setActivating(true);
    await new Promise((r) => setTimeout(r, 800));
    activateProtection(vault.id, selectedPolicy, selectedAgent);
    setActivating(false); setShowActivate(false);
  };

  const handleTrigger = async () => {
    setTriggering(true);
    simulateHeliusEvent(vault.id);
    await new Promise((r) => setTimeout(r, 600));
    triggerCircuit(vault.id);
    setTriggering(false);
  };

  return (
    <div style={{ background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: "14px", padding: "1.1rem 1.25rem", transition: "all 0.3s" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem", gap: "0.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", color: "var(--gold)" }}>{vault.id}</span>
            <span style={{ fontSize: "0.6rem", fontWeight: 700, padding: "0.08rem 0.4rem", borderRadius: "4px", background: `${sc.color}18`, color: sc.color, border: `1px solid ${sc.color}30`, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {sc.label}
            </span>
          </div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.1rem" }}>{vault.name}</div>
          <div style={{ fontSize: "0.65rem", color: "var(--subtle)" }}>{vault.asset} · {vault.assetType}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "0.58rem", color: cc.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.15rem" }}>
            Circuit {cc.label}
          </div>
          {vault.agentId && (
            <div style={{ fontSize: "0.6rem", color: "var(--subtle)" }}>
              {vault.agentId} · {AGENT_LABELS[vault.agentRole!]}
            </div>
          )}
        </div>
      </div>

      {/* Last Helius event */}
      {vault.lastHeliusEvent && (
        <div style={{ padding: "0.5rem 0.625rem", background: "rgba(255,255,255,0.03)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "0.625rem" }}>
          <div style={{ fontSize: "0.58rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.15rem" }}>
            Last Helius event · {ago(vault.lastHeliusEvent.ts)}
          </div>
          <div style={{ fontSize: "0.7rem", color: vault.lastHeliusEvent.riskSignal === "high" ? "#f26b6b" : vault.lastHeliusEvent.riskSignal === "medium" ? "#FBBF24" : "var(--muted)" }}>
            {vault.lastHeliusEvent.type}: {vault.lastHeliusEvent.description}
          </div>
        </div>
      )}

      {/* Last action */}
      {vault.lastAction && (
        <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
          {vault.lastAction}
        </div>
      )}

      {/* No policy warning */}
      {vault.state === "UNPROTECTED" && !showActivate && (
        <div style={{ fontSize: "0.65rem", color: "#FBBF24", marginBottom: "0.625rem" }}>
          No active policy — if risk occurs, no action will be taken.
        </div>
      )}

      {/* Activate panel */}
      {showActivate && (
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "0.75rem", marginBottom: "0.625rem", border: "1px solid var(--line)" }}>
          <div style={{ fontSize: "0.6rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>Select policy</div>
          {["Quick Protect (Recommended)", "Alert Only", "Aggressive Freeze"].map((p) => (
            <button key={p} onClick={() => setSelectedPolicy(p)} style={{ display: "block", width: "100%", textAlign: "left", background: selectedPolicy === p ? "rgba(20,241,149,0.08)" : "transparent", border: `1px solid ${selectedPolicy === p ? "rgba(20,241,149,0.25)" : "transparent"}`, borderRadius: "5px", padding: "0.3rem 0.5rem", color: selectedPolicy === p ? "#14F195" : "var(--muted)", fontSize: "0.7rem", cursor: "pointer", marginBottom: "0.2rem" }}>
              {p}
            </button>
          ))}
          <div style={{ fontSize: "0.6rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0.5rem 0 0.35rem" }}>Select agent</div>
          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
            {(["hedge","rebalance","yield_optimize","circuit_guard"] as AgentRole[]).map((r) => (
              <button key={r} onClick={() => setSelectedAgent(r)} style={{ background: selectedAgent === r ? "rgba(200,169,110,0.15)" : "var(--surface)", border: `1px solid ${selectedAgent === r ? "var(--gold)" : "var(--line)"}`, color: selectedAgent === r ? "var(--gold)" : "var(--muted)", borderRadius: "5px", padding: "0.2rem 0.5rem", fontSize: "0.6rem", cursor: "pointer" }}>
                {AGENT_LABELS[r]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        {vault.state === "UNPROTECTED" ? (
          !showActivate ? (
            <button onClick={() => setShowActivate(true)} style={{ flex: 1, background: "#14F195", color: "var(--void)", border: "none", borderRadius: "8px", padding: "0.6rem", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
              Activate Protection →
            </button>
          ) : (
            <>
              <button onClick={() => setShowActivate(false)} style={{ background: "none", border: "1px solid var(--line)", borderRadius: "7px", padding: "0.5rem 0.75rem", color: "var(--muted)", fontSize: "0.72rem", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleActivate} disabled={activating} style={{ flex: 1, background: "#14F195", color: "var(--void)", border: "none", borderRadius: "7px", padding: "0.5rem", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>
                {activating ? "Arming…" : "Arm Circuit →"}
              </button>
            </>
          )
        ) : vault.state === "PROTECTED" ? (
          <button onClick={handleTrigger} disabled={triggering} style={{ flex: 1, background: "rgba(242,107,107,0.1)", border: "1px solid rgba(242,107,107,0.3)", borderRadius: "7px", padding: "0.55rem", color: "#f26b6b", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
            {triggering ? "Simulating event…" : "Simulate risk event →"}
          </button>
        ) : vault.state === "AT_RISK" ? (
          <button onClick={handleTrigger} disabled={triggering} style={{ flex: 1, background: "var(--gold)", color: "var(--void)", border: "none", borderRadius: "7px", padding: "0.55rem", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>
            {triggering ? "Triggering circuit…" : "⚡ Trigger Circuit →"}
          </button>
        ) : (
          <div style={{ fontSize: "0.7rem", color: "#f26b6b", padding: "0.55rem 0" }}>Circuit triggered — freeze applied</div>
        )}
      </div>
    </div>
  );
}

// ─── Helius event stream panel ─────────────────────────────────────────────────
function HeliusPanel() {
  const { heliusEvents, heliusConnected, heliusUrl, vaults, setHeliusConnection, simulateHeliusEvent } = useSystemState();
  const [url, setUrl] = useState(heliusUrl ?? "");
  const [polling, setPolling] = useState(false);

  // Poll /api/helius for live events
  useEffect(() => {
    if (!heliusConnected) return;
    let lastTs = Date.now();
    const iv = setInterval(async () => {
      try {
        const res  = await fetch(`/api/helius?since=${lastTs}`);
        const data = await res.json();
        if (data.events?.length > 0) {
          lastTs = Date.now();
          data.events.forEach((e: typeof heliusEvents[0] & { vaultId?: string }) => {
            const { id: _, ...rest } = e;
            void _; // suppress unused
            import("@/lib/systemState").then(({ ingestHeliusEvent }) => ingestHeliusEvent({ ...rest, source: "helius" }));
          });
        }
      } catch {}
    }, 5_000);
    return () => clearInterval(iv);
  }, [heliusConnected]);

  const RISK_COLOR = { high: "#f26b6b", medium: "#FBBF24", low: "#14F195", none: "var(--subtle)" };

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ padding: "0.7rem 1rem", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: heliusConnected ? "#14F195" : "var(--subtle)", animation: heliusConnected ? "pulse 1.5s ease-in-out infinite" : "none" }} />
          <span style={{ fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Live Blockchain Event Stream (Helius)
          </span>
          <span style={{ fontSize: "0.58rem", color: heliusConnected ? "#14F195" : "#FBBF24", fontWeight: 600 }}>
            {heliusConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <button onClick={() => simulateHeliusEvent(vaults[0]?.id)} style={{ background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "6px", padding: "0.25rem 0.625rem", fontSize: "0.62rem", color: "var(--gold)", cursor: "pointer" }}>
          Simulate event
        </button>
      </div>

      {/* Connect form */}
      {!heliusConnected && (
        <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--line)", background: "rgba(251,191,36,0.04)" }}>
          <p style={{ fontSize: "0.65rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
            Register your webhook at <strong>dev.helius.xyz</strong> and paste the endpoint URL:
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.helius.xyz/v0/webhooks/..."
              style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)", borderRadius: "6px", padding: "0.4rem 0.625rem", color: "var(--text)", fontSize: "0.68rem", outline: "none" }}
            />
            <button onClick={() => setHeliusConnection(url, !!url.trim())} disabled={!url.trim()} style={{ background: "#14F195", color: "var(--void)", border: "none", borderRadius: "6px", padding: "0.4rem 0.875rem", fontSize: "0.7rem", fontWeight: 700, cursor: url.trim() ? "pointer" : "not-allowed" }}>
              Connect
            </button>
          </div>
        </div>
      )}

      {/* Event stream */}
      <div style={{ maxHeight: "260px", overflowY: "auto" }}>
        {heliusEvents.length === 0 && (
          <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--subtle)", fontSize: "0.72rem" }}>
            {heliusConnected ? "Waiting for events…" : "Not connected — use Simulate event above"}
          </div>
        )}
        {heliusEvents.map((e) => {
          const ago = Math.max(1, Math.floor((Date.now() - e.ts) / 1000));
          return (
            <div key={e.id} style={{ display: "grid", gridTemplateColumns: "8px 1fr auto", gap: "0.5rem", alignItems: "flex-start", padding: "0.5rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ display: "block", width: "6px", height: "6px", borderRadius: "50%", background: RISK_COLOR[e.riskSignal], marginTop: "4px" }} />
              <div>
                <span style={{ fontSize: "0.6rem", fontFamily: "'JetBrains Mono',monospace", color: "var(--subtle)", marginRight: "0.3rem" }}>
                  [{e.source.toUpperCase()}] {e.type}
                </span>
                <span style={{ fontSize: "0.72rem", color: e.riskSignal === "high" ? "#f26b6b" : e.riskSignal === "medium" ? "#FBBF24" : "var(--muted)" }}>
                  {e.description}
                </span>
                {e.stateChange && <div style={{ fontSize: "0.6rem", color: "#14F195", marginTop: "1px" }}>→ {e.stateChange}</div>}
              </div>
              <span style={{ fontSize: "0.58rem", color: "var(--subtle)", fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap" }}>{ago}s</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Create vault panel ───────────────────────────────────────────────────────
function CreateVaultPanel({ onCreated }: { onCreated: () => void }) {
  const [name, setName]       = useState("");
  const [assetIdx, setAssetIdx] = useState(0);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    await new Promise((r) => setTimeout(r, 600));
    const at = ASSET_TYPES[assetIdx];
    createSystemVault({ name: name.trim(), asset: at.name, assetType: at.key });
    setCreating(false);
    setName("");
    onCreated();
  };

  return (
    <div style={{ background: "rgba(20,241,149,0.05)", border: "1px solid rgba(20,241,149,0.2)", borderRadius: "12px", padding: "1.1rem 1.25rem" }}>
      <p style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#14F195", marginBottom: "0.75rem" }}>Create vault</p>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.625rem", flexWrap: "wrap" }}>
        <input value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Vault name (e.g. Mad Lads Guard)"
          style={{ flex: 1, minWidth: "160px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)", borderRadius: "7px", padding: "0.5rem 0.75rem", color: "var(--text)", fontSize: "0.75rem", outline: "none" }}
        />
      </div>
      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        {ASSET_TYPES.map((a, i) => (
          <button key={a.key} onClick={() => setAssetIdx(i)} style={{ background: assetIdx === i ? "rgba(200,169,110,0.15)" : "var(--surface)", border: `1px solid ${assetIdx === i ? "var(--gold)" : "var(--line)"}`, color: assetIdx === i ? "var(--gold)" : "var(--muted)", borderRadius: "5px", padding: "0.2rem 0.5rem", fontSize: "0.62rem", cursor: "pointer" }}>
            {a.icon} {a.name}
          </button>
        ))}
      </div>
      <button onClick={handleCreate} disabled={!name.trim() || creating} style={{ width: "100%", background: name.trim() ? "#14F195" : "var(--surface)", color: name.trim() ? "var(--void)" : "var(--subtle)", border: "none", borderRadius: "8px", padding: "0.65rem", fontWeight: 700, fontSize: "0.82rem", cursor: name.trim() ? "pointer" : "not-allowed", transition: "all 0.15s" }}>
        {creating ? "Deploying…" : "Deploy Vault →"}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProtectPage() {
  const { vaults, events, systemState } = useSystemState();
  const [showCreate, setShowCreate] = useState(false);

  const STATE_BG: Record<typeof systemState, string> = {
    NO_VAULTS:         "var(--subtle)",
    UNPROTECTED:       "#FBBF24",
    PROTECTED:         "#14F195",
    AT_RISK:           "var(--gold)",
    CIRCUIT_TRIGGERED: "#f26b6b",
  };

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1.25rem 3rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <p style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.3rem" }}>Vaults · Control Plane</p>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(1.5rem,4vw,2rem)", letterSpacing: "-0.02em", margin: 0 }}>
            Protection Systems
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "0.25rem 0.625rem", borderRadius: "100px", background: `${STATE_BG[systemState]}18`, color: STATE_BG[systemState], border: `1px solid ${STATE_BG[systemState]}33`, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {systemState.replace("_", " ")}
          </span>
          <button onClick={() => setShowCreate((v) => !v)} style={{ background: showCreate ? "var(--surface)" : "#14F195", color: showCreate ? "var(--muted)" : "var(--void)", border: `1px solid ${showCreate ? "var(--line)" : "#14F195"}`, borderRadius: "8px", padding: "0.4rem 0.875rem", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>
            {showCreate ? "Cancel" : "+ New Vault"}
          </button>
        </div>
      </div>

      {/* Create vault */}
      {showCreate && (
        <div style={{ marginBottom: "1.25rem" }}>
          <CreateVaultPanel onCreated={() => setShowCreate(false)} />
        </div>
      )}

      {/* No vaults state */}
      {vaults.length === 0 && !showCreate && (
        <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "14px", padding: "2.5rem", textAlign: "center", marginBottom: "1.25rem" }}>
          <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.5rem" }}>No vaults deployed</p>
          <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "1.25rem" }}>
            Deploy a vault to assign a Sophia agent and activate Circuit protection.
          </p>
          <button onClick={() => setShowCreate(true)} style={{ background: "#14F195", color: "var(--void)", border: "none", borderRadius: "8px", padding: "0.75rem 2rem", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}>
            Deploy First Vault →
          </button>
        </div>
      )}

      {/* Vault grid */}
      {vaults.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,380px),1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
          {vaults.map((v) => <VaultCard key={v.id} vault={v} />)}
        </div>
      )}

      {/* Helius event stream */}
      <HeliusPanel />

      {/* System event log */}
      {events.length > 0 && (
        <div style={{ marginTop: "1.25rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "0.7rem 1rem", borderBottom: "1px solid var(--line)" }}>
            <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>System Event Log</span>
          </div>
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {events.slice(0, 15).map((e) => {
              const ago = Math.max(1, Math.floor((Date.now() - e.ts) / 1000));
              const c   = e.severity === "alert" ? "#f26b6b" : e.severity === "warn" ? "#FBBF24" : "var(--muted)";
              return (
                <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem", padding: "0.4rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <div>
                    <span style={{ fontSize: "0.6rem", fontFamily: "'JetBrains Mono',monospace", color: "var(--subtle)", marginRight: "0.35rem" }}>{e.source}</span>
                    <span style={{ fontSize: "0.7rem", color: c }}>{e.message}</span>
                  </div>
                  <span style={{ fontSize: "0.58rem", color: "var(--subtle)", fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap" }}>{ago}s</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}