// FILE: components/ProtocolConsole.tsx
// Interactive protocol execution console.
// Simulation mode: instant deterministic state (no wallet required)
// Live mode: real Solana transactions with wallet signature
"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  useVaultEngine, startDemoMode, stopDemoMode,
  switchStrategy, UserVault, VaultEvent, SophiaStrategy,
} from "@/lib/vaultEngine";
import { useSolanaVault, TxPhase } from "@/lib/solana/useSolanaVault";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

// ─── Visual helpers ───────────────────────────────────────────────────────────
const LEVEL_COLOR: Record<string, string> = {
  LOW: "var(--green)", MEDIUM: "#f0d98a", HIGH: "var(--gold)", CRITICAL: "#f26b6b",
};
const LEVEL_BG: Record<string, string> = {
  LOW: "rgba(61,214,140,0.08)", MEDIUM: "rgba(240,217,138,0.06)", HIGH: "rgba(200,169,110,0.08)", CRITICAL: "rgba(242,107,107,0.08)",
};
const SOPHIA_COLOR: Record<string, string> = {
  monitoring: "var(--green)", acting: "var(--gold)", stabilized: "var(--green)",
};
const EVENT_DOT: Record<string, string> = {
  circuit: "#f0d98a", sophia: "var(--green)", vault: "var(--gold)", system: "var(--subtle)",
};
const STRATEGIES: SophiaStrategy[] = ["balanced", "aggressive", "conservative"];
const STRATEGY_LABELS: Record<SophiaStrategy, string> = {
  balanced: "Balanced", aggressive: "Aggressive", conservative: "Conservative",
};

const PHASE_LABELS: Record<TxPhase, string> = {
  idle:               "",
  building:           "Building transaction…",
  simulating:         "Simulating on-chain…",
  awaiting_signature: "Sign in your wallet",
  sending:            "Broadcasting…",
  confirmed:          "Confirmed ✓",
  error:              "Error",
};

// ─── Risk bar ─────────────────────────────────────────────────────────────────
function RiskBar({ score, prev }: { score: number; prev: number }) {
  const color = score >= 75 ? "#f26b6b" : score >= 50 ? "var(--gold)" : score >= 25 ? "#f0d98a" : "var(--green)";
  const delta = score - prev;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: "4px", transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", fontWeight: 700, color, minWidth: "30px" }}>{score}</span>
      {delta !== 0 && (
        <span style={{ fontSize: "0.62rem", fontWeight: 700, color: delta < 0 ? "var(--green)" : "#f26b6b", minWidth: "30px" }}>
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )}
    </div>
  );
}

// ─── Tx status badge ──────────────────────────────────────────────────────────
function TxBadge({ phase, error, lastTx }: { phase: TxPhase; error: string | null; lastTx: { signature: string; explorerUrl: string; simulated: boolean } | null }) {
  if (phase === "idle") return null;
  const isError = phase === "error";
  const isDone  = phase === "confirmed";
  return (
    <div style={{ padding: "0.5rem 0.75rem", borderRadius: "7px", background: isError ? "rgba(242,107,107,0.08)" : isDone ? "rgba(61,214,140,0.06)" : "rgba(200,169,110,0.06)", border: `1px solid ${isError ? "rgba(242,107,107,0.25)" : isDone ? "rgba(61,214,140,0.2)" : "rgba(200,169,110,0.2)"}`, marginBottom: "0.75rem" }}>
      {isError ? (
        <p style={{ fontSize: "0.72rem", color: "#f26b6b", margin: 0 }}>{error}</p>
      ) : isDone && lastTx ? (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--green)", fontWeight: 600 }}>Confirmed {lastTx.simulated ? "(simulated)" : "on-chain"}</span>
          <a href={lastTx.explorerUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.68rem", color: "var(--gold)", textDecoration: "none" }}>View on Solscan ↗</a>
        </div>
      ) : (
        <p style={{ fontSize: "0.72rem", color: "var(--gold)", margin: 0 }}>{PHASE_LABELS[phase]}</p>
      )}
    </div>
  );
}

// ─── Vault card ───────────────────────────────────────────────────────────────
function VaultCard({ vault, onTrigger, onSwitch, busy }: {
  vault:     UserVault;
  onTrigger: (id: string) => void;
  onSwitch:  (id: string, s: SophiaStrategy) => void;
  busy:      boolean;
}) {
  const lc = LEVEL_COLOR[vault.circuitLevel] ?? "var(--text)";
  const lb = LEVEL_BG[vault.circuitLevel]    ?? "transparent";
  const sc = SOPHIA_COLOR[vault.sophiaState] ?? "var(--green)";
  const acting = vault.sophiaState === "acting" || busy;

  return (
    <div style={{ background: lb, border: `1px solid ${lc}33`, borderRadius: "12px", padding: "1rem 1.1rem", transition: "all 0.4s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.15rem" }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", color: "var(--gold)" }}>{vault.id}</span>
            <span style={{ fontSize: "0.58rem", padding: "0.08rem 0.35rem", borderRadius: "3px", background: `${lc}18`, color: lc, border: `1px solid ${lc}33`, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{vault.circuitLevel}</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{vault.name}</div>
          <div style={{ fontSize: "0.68rem", color: "var(--subtle)", marginTop: "1px" }}>{vault.assetType}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", justifyContent: "flex-end", marginBottom: "0.2rem" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: sc, animation: acting ? "pulse 0.6s ease-in-out infinite" : "pulse 3s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.6rem", fontWeight: 700, color: sc, textTransform: "uppercase", letterSpacing: "0.08em" }}>{vault.sophiaState}</span>
          </div>
          <div style={{ fontSize: "0.62rem", color: "var(--subtle)" }}>{vault.agentId}</div>
        </div>
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <div style={{ fontSize: "0.58rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>Risk score</div>
        <RiskBar score={vault.riskScore} prev={vault.prevScore} />
      </div>

      <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.75rem" }}>
        {STRATEGIES.map((s) => (
          <button key={s} onClick={() => onSwitch(vault.id, s)} style={{ background: vault.strategy === s ? "rgba(200,169,110,0.15)" : "var(--surface)", border: `1px solid ${vault.strategy === s ? "var(--gold)" : "var(--line)"}`, color: vault.strategy === s ? "var(--gold)" : "var(--muted)", borderRadius: "5px", padding: "0.2rem 0.5rem", fontSize: "0.62rem", cursor: "pointer", transition: "all 0.15s" }}>
            {STRATEGY_LABELS[s]}
          </button>
        ))}
      </div>

      <button onClick={() => onTrigger(vault.id)} disabled={acting} style={{ width: "100%", background: acting ? "var(--surface)" : "var(--gold)", color: acting ? "var(--subtle)" : "var(--void)", border: "none", borderRadius: "7px", padding: "0.6rem 0.75rem", fontWeight: 700, fontSize: "0.75rem", cursor: acting ? "not-allowed" : "pointer", fontFamily: "'Space Grotesk',sans-serif", transition: "all 0.2s" }}>
        {acting ? PHASE_LABELS[busy ? "building" : "idle"] || "Sophia acting…" : "⚡ Trigger Risk Event"}
      </button>

      <div style={{ marginTop: "0.5rem", fontSize: "0.6rem", color: "var(--subtle)", textAlign: "right" }}>
        {vault.eventCount} event{vault.eventCount !== 1 ? "s" : ""} · {vault.phase}
      </div>
    </div>
  );
}

// ─── Event stream ─────────────────────────────────────────────────────────────
function EventStream({ events }: { events: VaultEvent[] }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", overflow: "hidden" }}>
      <div style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", animation: "pulse 1.5s ease-in-out infinite" }} />
        <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Protocol Feed</span>
        <span style={{ marginLeft: "auto", fontSize: "0.58rem", color: "var(--subtle)" }}>{events.length} events</span>
      </div>
      <div style={{ maxHeight: "360px", overflowY: "auto" }}>
        {events.slice(0, 18).map((e) => {
          const dot = EVENT_DOT[e.kind] ?? "var(--subtle)";
          const ago = Math.max(1, Math.floor((Date.now() - e.ts) / 1000));
          return (
            <div key={e.id} style={{ display: "grid", gridTemplateColumns: "8px 1fr auto", gap: "0.5rem", alignItems: "flex-start", padding: "0.5rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.04)", background: e.severity === "alert" ? "rgba(242,107,107,0.04)" : e.severity === "warn" ? "rgba(240,217,138,0.02)" : "transparent" }}>
              <span style={{ display: "block", width: "6px", height: "6px", borderRadius: "50%", background: dot, marginTop: "4px" }} />
              <div>
                <span style={{ fontSize: "0.62rem", fontFamily: "'JetBrains Mono',monospace", color: "var(--subtle)", marginRight: "0.4rem" }}>{e.source}</span>
                <span style={{ fontSize: "0.75rem", color: e.severity === "alert" ? "#f26b6b" : e.severity === "warn" ? "#f0d98a" : "var(--muted)" }}>{e.message}</span>
                {e.outcome && <div style={{ fontSize: "0.62rem", color: "var(--green)", marginTop: "1px" }}>{e.outcome}</div>}
              </div>
              <span style={{ fontSize: "0.58rem", color: "var(--subtle)", fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap" }}>{ago}s</span>
            </div>
          );
        })}
        {events.length === 0 && <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--subtle)", fontSize: "0.75rem" }}>Waiting for events…</div>}
      </div>
    </div>
  );
}

// ─── Onboarding strip ─────────────────────────────────────────────────────────
function OnboardStrip({ step, onDismiss }: { step: number; onDismiss: () => void }) {
  if (step >= 3) return null;
  const STEPS = [
    { n: 1, label: "Create Vault", done: step >= 1 },
    { n: 2, label: "Trigger Event", done: step >= 2 },
    { n: 3, label: "Sophia Responds", done: step >= 3 },
  ];
  return (
    <div style={{ background: "rgba(200,169,110,0.06)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "10px", padding: "0.75rem 1rem", marginBottom: "0.875rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
      <span style={{ fontSize: "0.62rem", color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>Start here</span>
      <div style={{ display: "flex", gap: "0.75rem", flex: 1, flexWrap: "wrap" }}>
        {STEPS.map((s) => (
          <div key={s.n} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: s.done ? "var(--green)" : "var(--surface)", border: `1px solid ${s.done ? "var(--green)" : "var(--line)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem", color: s.done ? "var(--void)" : "var(--subtle)", fontWeight: 700 }}>
              {s.done ? "✓" : s.n}
            </span>
            <span style={{ fontSize: "0.68rem", color: s.done ? "var(--green)" : "var(--muted)" }}>{s.label}</span>
          </div>
        ))}
      </div>
      <button onClick={onDismiss} style={{ background: "none", border: "none", color: "var(--subtle)", fontSize: "0.68rem", cursor: "pointer" }}>Dismiss</button>
    </div>
  );
}

// ─── Mode toggle ──────────────────────────────────────────────────────────────
function ModeToggle({ liveMode, setLiveMode }: { liveMode: boolean; setLiveMode: (v: boolean) => void }) {
  const { connected } = useWallet();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.875rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "8px", marginBottom: "0.875rem", flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <button onClick={() => setLiveMode(false)} style={{ background: !liveMode ? "rgba(61,214,140,0.1)" : "transparent", border: `1px solid ${!liveMode ? "rgba(61,214,140,0.3)" : "transparent"}`, color: !liveMode ? "var(--green)" : "var(--subtle)", borderRadius: "5px", padding: "0.25rem 0.625rem", fontSize: "0.68rem", cursor: "pointer", fontWeight: !liveMode ? 700 : 400 }}>
          ◉ Simulation
        </button>
        <button onClick={() => setLiveMode(true)} style={{ background: liveMode ? "rgba(200,169,110,0.1)" : "transparent", border: `1px solid ${liveMode ? "rgba(200,169,110,0.3)" : "transparent"}`, color: liveMode ? "var(--gold)" : "var(--subtle)", borderRadius: "5px", padding: "0.25rem 0.625rem", fontSize: "0.68rem", cursor: "pointer", fontWeight: liveMode ? 700 : 400 }}>
          ⬡ Live (Solana)
        </button>
      </div>
      {liveMode && !connected && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.65rem", color: "var(--subtle)" }}>Connect wallet to send transactions</span>
          <ConnectWalletButton size="sm" compact />
        </div>
      )}
      {liveMode && connected && (
        <span style={{ fontSize: "0.65rem", color: "var(--green)", marginLeft: "auto" }}>✓ Wallet connected — transactions will be real</span>
      )}
      {!liveMode && (
        <span style={{ fontSize: "0.62rem", color: "var(--subtle)", marginLeft: "auto" }}>Deterministic system · No wallet required</span>
      )}
    </div>
  );
}

// ─── Main console ─────────────────────────────────────────────────────────────
export function ProtocolConsole() {
  const engine   = useVaultEngine();
  const solana   = useSolanaVault();
  const [dismissed,   setDismissed]   = useState(false);
  const [newStrategy, setNewStrategy] = useState<SophiaStrategy>("balanced");
  const hasVault = engine.vaults.length > 0;
  const busy     = solana.phase !== "idle" && solana.phase !== "confirmed" && solana.phase !== "error";

  const handleCreate = async () => {
    await solana.createVaultOnChain(newStrategy);
  };

  const handleTrigger = async (id: string) => {
    const vault = engine.vaults.find((v) => v.id === id);
    if (!vault) return;
    solana.reset();
    await solana.triggerEventOnChain(id, vault.id, vault.riskScore, vault.strategy);
  };

  const handleSwitch = (id: string, s: SophiaStrategy) => {
    switchStrategy(id, s);
  };

  const handleDemo = () => {
    if (engine.demoRunning) stopDemoMode();
    else startDemoMode();
  };

  return (
    <div>
      {/* Mode labels */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.58rem", padding: "0.12rem 0.45rem", borderRadius: "4px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)", color: "var(--subtle)", letterSpacing: "0.06em" }}>
          {solana.liveMode ? "Live Mode · Solana Mainnet" : "Simulation Mode"}
        </span>
        <span style={{ fontSize: "0.58rem", padding: "0.12rem 0.45rem", borderRadius: "4px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)", color: "var(--subtle)", letterSpacing: "0.06em" }}>Deterministic System</span>
        <span style={{ marginLeft: "auto", fontSize: "0.6rem", color: "var(--subtle)" }}>No real asset custody</span>
      </div>

      {/* Onboarding */}
      {!dismissed && <OnboardStrip step={engine.onboardStep} onDismiss={() => setDismissed(true)} />}

      {/* Mode toggle */}
      <ModeToggle liveMode={solana.liveMode} setLiveMode={solana.setLiveMode} />

      {/* Tx status */}
      <TxBadge phase={solana.phase} error={solana.error} lastTx={solana.lastTx} />

      {/* No vault — dominant CTA */}
      {!hasVault && (
        <div style={{ background: "rgba(200,169,110,0.06)", border: "1px solid rgba(200,169,110,0.25)", borderRadius: "14px", padding: "2rem 1.5rem", marginBottom: "1rem", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.3rem", marginBottom: "0.5rem" }}>Start the protocol.</h2>
          <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "1.5rem" }}>Create a vault. Assign Sophia. Activate the Circuit.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            {STRATEGIES.map((s) => (
              <button key={s} onClick={() => setNewStrategy(s)} style={{ background: newStrategy === s ? "rgba(200,169,110,0.15)" : "var(--surface)", border: `1px solid ${newStrategy === s ? "var(--gold)" : "var(--line)"}`, color: newStrategy === s ? "var(--gold)" : "var(--muted)", borderRadius: "6px", padding: "0.3rem 0.75rem", fontSize: "0.7rem", cursor: "pointer" }}>
                {STRATEGY_LABELS[s]}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.625rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={handleCreate} disabled={busy} style={{ background: "var(--gold)", color: "var(--void)", border: "none", borderRadius: "8px", padding: "0.75rem 1.75rem", fontWeight: 700, fontSize: "0.9rem", cursor: busy ? "not-allowed" : "pointer", fontFamily: "'Space Grotesk',sans-serif" }}>
              {busy ? PHASE_LABELS[solana.phase] : "Create Vault"}
            </button>
            <button onClick={handleDemo} style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: "8px", padding: "0.75rem 1.5rem", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>
              Enter Demo Mode
            </button>
          </div>
        </div>
      )}

      {/* Active layout */}
      {hasVault && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,300px),1fr))", gap: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {engine.vaults.slice(0, 3).map((v) => (
              <VaultCard key={v.id} vault={v} onTrigger={handleTrigger} onSwitch={handleSwitch} busy={busy} />
            ))}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={handleCreate} disabled={busy} style={{ flex: 1, background: "var(--surface)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: "7px", padding: "0.55rem", fontSize: "0.72rem", cursor: busy ? "not-allowed" : "pointer", fontWeight: 600 }}>
                + New Vault
              </button>
              <button onClick={handleDemo} style={{ flex: 1, background: engine.demoRunning ? "rgba(242,107,107,0.1)" : "rgba(200,169,110,0.08)", color: engine.demoRunning ? "#f26b6b" : "var(--gold)", border: `1px solid ${engine.demoRunning ? "rgba(242,107,107,0.3)" : "rgba(200,169,110,0.25)"}`, borderRadius: "7px", padding: "0.55rem", fontSize: "0.72rem", cursor: "pointer", fontWeight: 600 }}>
                {engine.demoRunning ? "⏹ Stop Demo" : "▶ Demo Mode"}
              </button>
            </div>
          </div>
          <EventStream events={engine.events} />
        </div>
      )}
    </div>
  );
}