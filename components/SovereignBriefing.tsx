// FILE: components/SovereignBriefing.tsx
// Orbis-gated intelligence feed.
// Access: only users with a deployed vault (holding a Vault NFT position)
// can read the raw agent reasoning, Circuit Shield logs, and Bags Index signal.
//
// Orbis Protocol: decentralized social feeds + access gating via token ownership.
// CURRENT: gated by local vault state (has deployed vault = has position).
// PRODUCTION: replace hasPosition check with Orbis.isAllowed(walletAddress, contextId).
// Orbis SDK: @orbisclub/orbis-sdk (not installed. would need npm install).
"use client";

import { useState, useEffect } from "react";
import { useSystemState } from "@/lib/systemState";
import { getSession, executeAutonomousAction } from "@/lib/openclaw/circuitAgent";
import { useAgentFuel } from "@/lib/x402/agentFuel";
import { BagsToken } from "@/app/api/bags/route";

// ─── Access gate ──────────────────────────────────────────────────────────────
function AccessGate({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div style={{ background: "rgba(200,169,110,0.06)", border: "1px dashed rgba(200,169,110,0.3)", borderRadius: "14px", padding: "2rem", textAlign: "center" }}>
      <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>⬡</div>
      <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1rem", marginBottom: "0.4rem" }}>
        Sovereign Briefing
      </h3>
      <p style={{ fontSize: "0.72rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "1.25rem", maxWidth: "320px", margin: "0 auto 1.25rem" }}>
        Vault NFT required. Deploy a vault position to unlock agent reasoning, Circuit logs, and Bags sentiment intelligence.
      </p>
      <div style={{ fontSize: "0.6rem", color: "var(--subtle)", padding: "0.4rem 0.75rem", borderRadius: "6px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)", display: "inline-block", marginBottom: "1rem" }}>
        Orbis Protocol Access Gate · Token-2022 NFT required
      </div>
    </div>
  );
}

// ─── OpenClaw delegation panel ────────────────────────────────────────────────
function DelegationPanel({ vaultId, agentId }: { vaultId: string; agentId: string }) {
  const [session, setSession] = useState(() => getSession(vaultId));
  const [delegating, setDelegating] = useState(false);
  const fuel = useAgentFuel(agentId);

  const delegate = async () => {
    setDelegating(true);
    await new Promise((r) => setTimeout(r, 800));
    const { delegateAgent } = await import("@/lib/openclaw/circuitAgent");
    const s = delegateAgent(vaultId, agentId);
    setSession(s);
    setDelegating(false);
  };

  const revoke = () => {
    const { revokeSession } = require("@/lib/openclaw/circuitAgent");
    revokeSession(vaultId);
    setSession(null);
  };

  const isDelegated = session?.authorization === "delegated";
  const expiresIn   = session ? Math.max(0, Math.floor((session.expiresAt - Date.now()) / 3_600_000)) : 0;

  return (
    <div style={{ background: isDelegated ? "rgba(20,241,149,0.05)" : "var(--surface)", border: `1px solid ${isDelegated ? "rgba(20,241,149,0.2)" : "var(--line)"}`, borderRadius: "10px", padding: "0.875rem 1rem", marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: isDelegated ? "#14F195" : "var(--subtle)", animation: isDelegated ? "pulse 2s ease-in-out infinite" : "none" }} />
            <span style={{ fontSize: "0.62rem", fontWeight: 700, color: isDelegated ? "#14F195" : "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              OpenClaw Agent {isDelegated ? "ARMED" : "INACTIVE"}
            </span>
          </div>
          <p style={{ fontSize: "0.65rem", color: "var(--muted)" }}>
            {isDelegated
              ? `Autonomous execution active · Expires in ${expiresIn}h · Max LTV 70%`
              : "Authorize agent to execute Circuit Shield repayments without approval"}
          </p>
        </div>
        {isDelegated
          ? <button onClick={revoke} style={{ background: "rgba(242,107,107,0.1)", border: "1px solid rgba(242,107,107,0.25)", borderRadius: "6px", padding: "0.3rem 0.625rem", fontSize: "0.65rem", color: "#f26b6b", cursor: "pointer" }}>Revoke</button>
          : <button onClick={delegate} disabled={delegating || fuel.lowFuel} style={{ background: "#14F195", color: "var(--void)", border: "none", borderRadius: "6px", padding: "0.3rem 0.75rem", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>
              {delegating ? "Signing…" : "Authorize Agent →"}
            </button>
        }
      </div>
      {isDelegated && session && session.actionsLog.length > 0 && (
        <div style={{ borderTop: "1px solid rgba(20,241,149,0.1)", paddingTop: "0.5rem", marginTop: "0.4rem" }}>
          <p style={{ fontSize: "0.56rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.3rem" }}>
            Autonomous actions log
          </p>
          {session.actionsLog.slice(0, 4).map((a) => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.62rem", padding: "0.2rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ color: a.status === "executed" ? "#14F195" : a.status === "blocked" ? "#f26b6b" : "var(--muted)" }}>
                [{a.type.toUpperCase()}] {a.reason.slice(0, 50)}
              </span>
              <span style={{ color: "var(--subtle)", fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap", marginLeft: "0.5rem" }}>
                {Math.floor((Date.now() - a.ts) / 1000)}s
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Bags Index signal panel ──────────────────────────────────────────────────
function BagsPanel() {
  const [tokens, setTokens]   = useState<BagsToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]     = useState({ volume: 0, yield1d: 0 });

  useEffect(() => {
    fetch("/api/bags").then((r) => r.json()).then((d) => {
      if (d.ok) { setTokens(d.tokens.slice(0, 8)); setTotal({ volume: d.totalVolume, yield1d: d.totalYield1d }); }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const SIGNAL_COLOR = { accumulate: "#14F195", hold: "#FBBF24", exit: "#f26b6b" };
  const fmt = (n: number) => n >= 1000 ? `$${(n/1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", overflow: "hidden", marginBottom: "1rem" }}>
      <div style={{ padding: "0.625rem 1rem", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Bags Index · Social Yield
        </span>
        {!loading && (
          <span style={{ fontSize: "0.58rem", color: "var(--subtle)", fontFamily: "'JetBrains Mono',monospace" }}>
            {fmt(total.volume)} vol · {fmt(total.yield1d)}/day yield
          </span>
        )}
      </div>
      {loading && <div style={{ padding: "1rem", textAlign: "center", color: "var(--subtle)", fontSize: "0.68rem" }}>Loading Bags data…</div>}
      {!loading && tokens.map((t) => (
        <div key={t.symbol} style={{ display: "grid", gridTemplateColumns: "24px 1fr 60px 60px 50px", gap: "0.5rem", alignItems: "center", padding: "0.4rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <span style={{ fontSize: "0.58rem", color: "var(--subtle)", fontFamily: "'JetBrains Mono',monospace" }}>#{t.rank}</span>
          <div>
            <span style={{ fontSize: "0.72rem", fontWeight: 600 }}>{t.creator}</span>
            <span style={{ fontSize: "0.58rem", color: "var(--subtle)", marginLeft: "0.35rem" }}>${t.symbol}</span>
          </div>
          <span style={{ fontSize: "0.65rem", color: "var(--muted)", textAlign: "right" }}>{fmt(t.volume24h)}</span>
          <span style={{ fontSize: "0.65rem", fontWeight: 600, color: t.change24h >= 0 ? "#14F195" : "#f26b6b", textAlign: "right" }}>
            {t.change24h >= 0 ? "+" : ""}{t.change24h.toFixed(1)}%
          </span>
          <span style={{ fontSize: "0.58rem", fontWeight: 700, color: SIGNAL_COLOR[t.signal], textAlign: "right", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {t.signal}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Raw agent reasoning ──────────────────────────────────────────────────────
function AgentReasoningLog({ vaultId }: { vaultId: string }) {
  const { events } = useSystemState();
  const vaultEvents = events.filter((e) => !e.vaultId || e.vaultId === vaultId).slice(0, 20);

  return (
    <div style={{ background: "rgba(2,3,10,0.97)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: "10px", overflow: "hidden" }}>
      <div style={{ padding: "0.6rem 1rem", borderBottom: "1px solid rgba(96,165,250,0.1)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#60A5FA", animation: "pulse 2s ease-in-out infinite" }} />
        <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#60A5FA", fontFamily: "'JetBrains Mono',monospace" }}>
          RAW AGENT REASONING · CLASSIFIED
        </span>
      </div>
      <div style={{ maxHeight: "220px", overflowY: "auto", padding: "0.5rem 0", fontFamily: "'JetBrains Mono',monospace" }}>
        {vaultEvents.length === 0 && (
          <p style={{ padding: "1rem", fontSize: "0.6rem", color: "var(--subtle)" }}>
            {"> AWAITING AGENT SIGNAL…"}
          </p>
        )}
        {vaultEvents.map((e) => {
          const ago = Math.max(1, Math.floor((Date.now() - e.ts) / 1000));
          const c   = e.severity === "alert" ? "#f26b6b" : e.severity === "warn" ? "#FBBF24" : "rgba(96,165,250,0.7)";
          return (
            <div key={e.id} style={{ padding: "0.2rem 1rem", display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.6rem", color: c, lineHeight: 1.5 }}>
                {e.source} {e.message}
              </span>
              <span style={{ fontSize: "0.54rem", color: "rgba(255,255,255,0.2)", whiteSpace: "nowrap" }}>{ago}s</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SovereignBriefing() {
  const { vaults } = useSystemState();
  const hasPosition = vaults.length > 0;
  const primaryVault = vaults[0];

  if (!hasPosition) {
    return <AccessGate onUnlock={() => {}} />;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <span style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--gold)" }}>
          ⬡ Sovereign Briefing
        </span>
        <span style={{ fontSize: "0.56rem", padding: "0.1rem 0.4rem", borderRadius: "3px", background: "rgba(200,169,110,0.1)", color: "var(--gold)", border: "1px solid rgba(200,169,110,0.25)" }}>
          Vault NFT Access · Orbis Gated
        </span>
      </div>

      {/* OpenClaw delegation */}
      {primaryVault && (
        <DelegationPanel
          vaultId={primaryVault.id}
          agentId={primaryVault.agentId ?? "SOPHIA-HED"}
        />
      )}

      {/* Bags Index signal */}
      <BagsPanel />

      {/* Raw agent reasoning. classified */}
      {primaryVault && <AgentReasoningLog vaultId={primaryVault.id} />}
    </div>
  );
}