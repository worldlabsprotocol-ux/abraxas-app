// FILE: app/protect/page.tsx
// Vaults — sovereign capital command center.
// Circuit engine is embedded as a live sub-panel powering each vault.
// No standalone /circuit route needed — the engine lives here.
// All asset data from data/inventory.json via /api/cards.
"use client";

import { useState, useEffect, useCallback } from "react";
import { SovereignPulse } from "@/components/SovereignPulse";
import { CircuitShield } from "@/components/CircuitShield";
import {
  useSystemState, VaultState, CircuitState,
  activateProtection, triggerCircuit, simulateHeliusEvent, createSystemVault,
} from "@/lib/systemState";
import { ASSET_TYPES } from "@/lib/appData";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SignalRow {
  signal: string; value: number; threshold: number;
  breached: boolean; weight: number;
}
interface RiskResult {
  vaultId: string; score: number; state: string;
  signals: SignalRow[]; evaluatedAt: string;
}
interface VaultAsset {
  id: string; name: string; category: string;
  priceUsd: number; insuranceUsd: number;
  defenseLevel: string; circuitScore: number;
  imagePath: string; protected: boolean; staked: boolean;
  last_sold_price?: number; last_sold_source?: string;
}

// ─── State config ─────────────────────────────────────────────────────────────
const STATE_CFG: Record<VaultState, { color: string; bg: string; border: string; label: string }> = {
  UNPROTECTED:       { color:"#FBBF24", bg:"rgba(251,191,36,0.06)",   border:"rgba(251,191,36,0.2)",   label:"Unprotected"       },
  PROTECTED:         { color:"#14F195", bg:"rgba(20,241,149,0.06)",   border:"rgba(20,241,149,0.2)",   label:"Protected"         },
  AT_RISK:           { color:"#C8A96E", bg:"rgba(200,169,110,0.08)",  border:"rgba(200,169,110,0.25)", label:"At Risk"           },
  CIRCUIT_TRIGGERED: { color:"#f26b6b", bg:"rgba(242,107,107,0.08)", border:"rgba(242,107,107,0.25)", label:"Circuit Triggered" },
};

const RISK_STATE_COLOR: Record<string, string> = {
  LOW:"#14F195", MEDIUM:"#FBBF24", HIGH:"#fb923c", CRITICAL:"#f26b6b",
};

// ─── Circuit engine sub-panel ─────────────────────────────────────────────────
// Fetches /api/circuit for the selected vaultId and renders the live risk breakdown.
// This IS the circuit page — embedded as the engine that powers vaults.
function CircuitEngine({ vaultId, vaultName }: { vaultId: string; vaultName: string }) {
  const [result,  setResult]  = useState<RiskResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick,    setTick]    = useState(0);

  const load = useCallback(async () => {
    try {
      const res  = await fetch(`/api/circuit?vaultId=${vaultId}`);
      const data = await res.json();
      if (data.ok) setResult(data.result);
    } catch {}
    finally { setLoading(false); }
  }, [vaultId]);

  useEffect(() => {
    load();
    const iv = setInterval(() => { load(); setTick(t => t + 1); }, 30_000);
    return () => clearInterval(iv);
  }, [load]);

  const score   = result?.score ?? 0;
  const rState  = result?.state ?? "LOW";
  const rColor  = RISK_STATE_COLOR[rState] ?? "#14F195";

  return (
    <div style={{
      background: "rgba(2,3,10,0.9)",
      border: `1px solid ${rColor}22`,
      borderRadius: "10px",
      overflow: "hidden",
      marginTop: "0.875rem",
    }}>
      {/* Engine header */}
      <div style={{
        padding: "0.5rem 0.75rem",
        background: `${rColor}08`,
        borderBottom: `1px solid ${rColor}18`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <span style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: rColor, animation: "pulse 2s ease-in-out infinite",
            boxShadow: `0 0 6px ${rColor}`,
          }} />
          <span style={{ fontSize: "0.52rem", fontWeight: 700, color: rColor, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace" }}>
            Circuit Engine · {rState}
          </span>
        </div>
        <span style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono',monospace", fontVariantNumeric: "tabular-nums" }}>
          {loading ? "scanning…" : `${score}/100`}
        </span>
      </div>

      {/* Risk score bar */}
      <div style={{ padding: "0.625rem 0.75rem" }}>
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "3px", height: "4px", marginBottom: "0.625rem" }}>
          <div style={{
            width: `${score}%`, height: "100%", borderRadius: "3px",
            background: `linear-gradient(90deg, ${rColor}88, ${rColor})`,
            transition: "width 0.6s ease",
          }} />
        </div>

        {/* Signal grid */}
        {result?.signals?.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.22rem" }}>
            {result.signals.map((s: SignalRow) => {
              const sc = s.breached ? "#f26b6b" : "#14F195";
              return (
                <div key={s.signal} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0.5rem", alignItems: "center" }}>
                  <span style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono',monospace", textTransform: "uppercase", letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.signal}
                  </span>
                  <span style={{ fontSize: "0.5rem", color: sc, fontFamily: "'JetBrains Mono',monospace", fontVariantNumeric: "tabular-nums" }}>
                    {s.value.toFixed(1)}
                  </span>
                  <span style={{ fontSize: "0.44rem", color: s.breached ? "#f26b6b" : "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono',monospace" }}>
                    {s.breached ? "BREACH" : "SAFE"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: "0.54rem", color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono',monospace", textAlign: "center", padding: "0.25rem 0" }}>
            {loading ? "LOADING SIGNALS…" : "NO SIGNAL DATA"}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Vault card ───────────────────────────────────────────────────────────────
interface VaultCardProps { vault: ReturnType<typeof buildVault>; assets: VaultAsset[] }

function buildVault(id: string, name: string, agent: string) {
  return { id, name, agent };
}

const SYSTEM_VAULTS = [
  buildVault("490", "Vault ALPHA-490", "Sophia-Hed"),
  buildVault("491", "Vault BETA-491",  "Sophia-Reb"),
  buildVault("492", "Vault GAMMA-492", "Sophia-Yld"),
];

function VaultCard({ vault, assets }: VaultCardProps) {
  const { vaults } = useSystemState();
  const sv      = vaults.find(v => v.id === vault.id);
  const vState  = sv?.state ?? "UNPROTECTED";
  const sc      = STATE_CFG[vState];
  const [expanded, setExpanded] = useState(false);

  const locked = assets.filter(a => a.protected).slice(0, 3);
  const tvl    = locked.reduce((s, a) => s + a.insuranceUsd, 0);

  return (
    <div style={{
      background: sc.bg, border: `1px solid ${sc.border}`,
      borderRadius: "14px", overflow: "hidden",
      transition: "border-color 0.3s",
    }}>
      {/* Vault header */}
      <div style={{ padding: "1rem", borderBottom: `1px solid ${sc.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.625rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.15rem" }}>
              <CircuitShield vaultId={vault.id} />
              <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "#f0f0f0" }}>{vault.name}</span>
            </div>
            <div style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono',monospace" }}>
              Agent: {vault.agent}
            </div>
          </div>
          <div style={{
            padding: "0.15rem 0.5rem", borderRadius: "4px",
            background: `${sc.color}18`, border: `1px solid ${sc.color}33`,
            fontSize: "0.52rem", fontWeight: 700, color: sc.color,
            letterSpacing: "0.08em", textTransform: "uppercase",
            fontFamily: "'JetBrains Mono',monospace",
          }}>
            {sc.label}
          </div>
        </div>

        {/* TVL stat */}
        <div style={{ marginBottom: "0.5rem" }}>
          <div style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono',monospace", marginBottom: "1px" }}>Insured Value</div>
          <div style={{ fontWeight: 800, fontSize: "1.1rem", fontVariantNumeric: "tabular-nums", fontFamily: "'JetBrains Mono',monospace" }}>
            ${tvl.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button onClick={() => activateProtection(vault.id)} style={{
            flex: 1, padding: "0.375rem", borderRadius: "7px", fontSize: "0.6rem", fontWeight: 700,
            background: "rgba(20,241,149,0.1)", border: "1px solid rgba(20,241,149,0.25)",
            color: "#14F195", cursor: "pointer", fontFamily: "inherit",
          }}>
            Arm
          </button>
          <button onClick={() => simulateHeliusEvent(vault.id)} style={{
            flex: 1, padding: "0.375rem", borderRadius: "7px", fontSize: "0.6rem", fontWeight: 700,
            background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.2)",
            color: "#C8A96E", cursor: "pointer", fontFamily: "inherit",
          }}>
            Simulate
          </button>
          <button onClick={() => setExpanded(e => !e)} style={{
            flex: 1, padding: "0.375rem", borderRadius: "7px", fontSize: "0.6rem", fontWeight: 700,
            background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)",
            color: "#60A5FA", cursor: "pointer", fontFamily: "inherit",
          }}>
            {expanded ? "Hide Engine" : "Circuit Engine"}
          </button>
        </div>
      </div>

      {/* Embedded Circuit Engine — the engine that powers this vault */}
      {expanded && <div style={{ padding: "0 0.875rem 0.875rem" }}>
        <CircuitEngine vaultId={vault.id} vaultName={vault.name} />
      </div>}

      {/* Locked assets */}
      {locked.length > 0 && (
        <div style={{ padding: "0.625rem 0.875rem 0.875rem" }}>
          <div style={{ fontSize: "0.46rem", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono',monospace", marginBottom: "0.375rem" }}>
            Protected Assets
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {locked.map(a => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.3rem 0.4rem", background: "rgba(255,255,255,0.03)", borderRadius: "5px" }}>
                <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                  {a.name}
                </span>
                <span style={{ fontSize: "0.56rem", fontWeight: 700, color: "#C8A96E", fontFamily: "'JetBrains Mono',monospace", fontVariantNumeric: "tabular-nums" }}>
                  ${a.insuranceUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function VaultsPage() {
  const { systemState, vaults: svaults } = useSystemState();
  const [assets, setAssets]  = useState<VaultAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch("/api/cards");
        const data = await res.json();
        if (data.ok) setAssets(data.assets);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  // Auto-create system vaults if none exist
  useEffect(() => {
    if (svaults.length === 0 && assets.length > 0) {
      SYSTEM_VAULTS.forEach(v => createSystemVault(v.id, v.name, "UNPROTECTED", "SOPHIA"));
    }
  }, [svaults.length, assets.length]);

  const totalInsured = assets.filter(a => a.protected).reduce((s, a) => s + a.insuranceUsd, 0);
  const protected_ct = assets.filter(a => a.protected).length;

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "1.5rem 1.25rem 5rem" }}>

      {/* Page header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.54rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono',monospace", marginBottom: "0.2rem" }}>
          Abraxas Protocol · Sovereign Vaults
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "0.75rem" }}>
          <h1 style={{ fontWeight: 900, fontSize: "clamp(1.4rem,3vw,1.9rem)", letterSpacing: "-0.02em", margin: 0 }}>
            Vault Terminal
          </h1>
          <div style={{ display: "flex", gap: "1.25rem" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#14F195", fontFamily: "'JetBrains Mono',monospace", fontVariantNumeric: "tabular-nums" }}>
                ${totalInsured.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Total Insured</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", fontFamily: "'JetBrains Mono',monospace" }}>{protected_ct}</div>
              <div style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Protected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sovereign Pulse — live event stream */}
      <div style={{ marginBottom: "1.25rem" }}>
        <SovereignPulse />
      </div>

      {/* Vault grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,300px),1fr))", gap: "0.875rem" }}>
        {SYSTEM_VAULTS.map(v => (
          <VaultCard key={v.id} vault={v} assets={assets} />
        ))}
      </div>

      {/* $5,000 liquidity ceiling notice */}
      <div style={{
        marginTop: "1.25rem", padding: "0.625rem 1rem",
        background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.18)",
        borderRadius: "8px", fontFamily: "'JetBrains Mono',monospace",
        display: "flex", gap: "0.625rem", alignItems: "center",
      }}>
        <span style={{ fontSize: "0.52rem", fontWeight: 700, color: "#D4AF37", letterSpacing: "0.08em" }}>
          LIQUIDITY CEILING
        </span>
        <span style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.4)" }}>
          Sports assets are hard-capped at $5,000 per vault position. Assets exceeding this threshold are excluded from vault deposit and exit logic.
        </span>
      </div>
    </div>
  );
}