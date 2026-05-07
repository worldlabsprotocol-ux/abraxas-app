// FILE: app/protect/page.tsx
// Sovereign Vault Terminal.
// Circuit Engine embedded as sub-panel powering each vault.
// Borrow USDC against Stocks (70% LTV) and Timepieces (65% LTV).
// Yield Strategist toggle: auto-lend collateral to earn $ABX.
// $5,000 sports ceiling enforced.
"use client";

import { useState, useEffect, useCallback } from "react";
import { SovereignPulse } from "@/components/SovereignPulse";
import { CircuitShield } from "@/components/CircuitShield";
import {
  useSystemState, VaultState, CircuitState,
  activateProtection, triggerCircuit, simulateHeliusEvent, createSystemVault,
} from "@/lib/systemState";

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
  ltv?: number; can_borrow?: boolean; borrow_token?: string;
  borrow_max_usd?: number; apy?: number;
  liquidity_velocity?: string;
}

// ─── State config ─────────────────────────────────────────────────────────────
const STATE_CFG: Record<VaultState, { color: string; bg: string; border: string; label: string }> = {
  UNPROTECTED:       { color:"#FBBF24", bg:"rgba(251,191,36,0.05)",   border:"rgba(251,191,36,0.18)",  label:"Unprotected"       },
  PROTECTED:         { color:"#14F195", bg:"rgba(20,241,149,0.05)",   border:"rgba(20,241,149,0.18)",  label:"Protected"         },
  AT_RISK:           { color:"#C8A96E", bg:"rgba(200,169,110,0.07)",  border:"rgba(200,169,110,0.22)", label:"At Risk"           },
  CIRCUIT_TRIGGERED: { color:"#f26b6b", bg:"rgba(242,107,107,0.07)", border:"rgba(242,107,107,0.22)", label:"Circuit Triggered" },
};
const RISK_COLOR: Record<string, string> = {
  LOW:"#14F195", MEDIUM:"#FBBF24", HIGH:"#fb923c", CRITICAL:"#f26b6b",
};

// ─── Circuit Engine ────────────────────────────────────────────────────────────
function CircuitEngine({ vaultId }: { vaultId: string }) {
  const [result,  setResult]  = useState<RiskResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [yieldOn, setYieldOn] = useState(false);
  const [yieldApy, setYieldApy] = useState(0);

  const load = useCallback(async () => {
    try {
      const res  = await fetch(`/api/circuit?vaultId=${vaultId}`);
      const data = await res.json();
      if (data.ok) setResult(data.result);
    } catch {} finally { setLoading(false); }
  }, [vaultId]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, [load]);

  useEffect(() => {
    if (yieldOn) {
      const base = 6.4 + Math.random() * 2.8;
      setYieldApy(Math.round(base * 100) / 100);
    }
  }, [yieldOn]);

  const score  = result?.score ?? 0;
  const rState = result?.state ?? "LOW";
  const rc     = RISK_COLOR[rState] ?? "#14F195";

  return (
    <div style={{ background:"rgba(2,3,10,0.92)", border:`1px solid ${rc}1a`, borderRadius:"10px", overflow:"hidden", marginTop:"0.875rem" }}>
      {/* Header */}
      <div style={{ padding:"0.5rem 0.75rem", background:`${rc}08`, borderBottom:`1px solid ${rc}12`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.375rem" }}>
          <span style={{ width:"6px", height:"6px", borderRadius:"50%", background:rc, animation:"pulse 2s ease-in-out infinite", boxShadow:`0 0 6px ${rc}` }} />
          <span style={{ fontSize:"0.5rem", fontWeight:700, color:rc, letterSpacing:"0.12em", textTransform:"uppercase", fontFamily:"'JetBrains Mono',monospace" }}>
            Circuit Engine · {rState}
          </span>
        </div>
        <span style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.25)", fontFamily:"'JetBrains Mono',monospace", fontVariantNumeric:"tabular-nums" }}>
          {loading ? "scanning…" : `${score}/100`}
        </span>
      </div>

      <div style={{ padding:"0.625rem 0.75rem" }}>
        {/* Risk bar */}
        <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"3px", height:"3px", marginBottom:"0.625rem" }}>
          <div style={{ width:`${score}%`, height:"100%", background:`linear-gradient(90deg,${rc}88,${rc})`, borderRadius:"3px", transition:"width 0.6s ease" }} />
        </div>

        {/* Signals */}
        {result?.signals?.length ? (
          <div style={{ display:"flex", flexDirection:"column", gap:"0.2rem", marginBottom:"0.5rem" }}>
            {result.signals.map((s) => {
              const sc = s.breached ? "#f26b6b" : "#14F195";
              return (
                <div key={s.signal} style={{ display:"grid", gridTemplateColumns:"1fr auto auto", gap:"0.4rem", alignItems:"center" }}>
                  <span style={{ fontSize:"0.48rem", color:"rgba(255,255,255,0.38)", fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase", letterSpacing:"0.05em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.signal}</span>
                  <span style={{ fontSize:"0.48rem", color:sc, fontFamily:"'JetBrains Mono',monospace", fontVariantNumeric:"tabular-nums" }}>{s.value.toFixed(1)}</span>
                  <span style={{ fontSize:"0.44rem", color:s.breached?"#f26b6b":"rgba(255,255,255,0.18)", fontFamily:"'JetBrains Mono',monospace" }}>{s.breached?"BREACH":"OK"}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.2)", fontFamily:"'JetBrains Mono',monospace", textAlign:"center", marginBottom:"0.5rem" }}>
            {loading ? "LOADING SIGNALS…" : "NO SIGNAL DATA"}
          </div>
        )}

        {/* Yield Strategist toggle */}
        <div style={{ padding:"0.4rem 0.5rem", background:"rgba(200,169,110,0.06)", border:"1px solid rgba(200,169,110,0.15)", borderRadius:"6px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <p style={{ fontSize:"0.52rem", fontWeight:700, color:"#C8A96E", fontFamily:"'JetBrains Mono',monospace", margin:"0 0 1px" }}>
                Yield Strategist
              </p>
              <p style={{ fontSize:"0.46rem", color:"rgba(255,255,255,0.3)", margin:0 }}>
                {yieldOn ? `Auto-lending at ${yieldApy}% APY → $ABX` : "Lend collateral to earn $ABX"}
              </p>
            </div>
            <button onClick={() => setYieldOn(y => !y)} style={{ width:"32px", height:"18px", borderRadius:"100px", border:"none", cursor:"pointer", background:yieldOn?"#C8A96E":"rgba(255,255,255,0.1)", position:"relative", flexShrink:0, transition:"background 0.2s" }}>
              <span style={{ position:"absolute", top:"1px", left:yieldOn?"15px":"1px", width:"16px", height:"16px", borderRadius:"50%", background:"#fff", transition:"left 0.2s", display:"block" }} />
            </button>
          </div>
          {yieldOn && (
            <div style={{ marginTop:"0.3rem", fontSize:"0.48rem", color:"#C8A96E", fontFamily:"'JetBrains Mono',monospace" }}>
              ↳ Routing: Kamino → $ABX auto-buy → Arena ante funded
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Borrow panel (Stocks & Timepieces) ──────────────────────────────────────
function BorrowPanel({ asset }: { asset: VaultAsset }) {
  const [borrowing, setBorrowing] = useState(false);
  const [done,      setDone]      = useState(false);
  const maxUsd = asset.borrow_max_usd ?? 0;
  const ltv    = (asset.ltv ?? 0.70) * 100;

  if (!asset.can_borrow) return null;

  async function handleBorrow() {
    setBorrowing(true);
    await new Promise(r => setTimeout(r, 1000));
    setBorrowing(false);
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  }

  return (
    <div style={{ padding:"0.35rem 0.5rem", background:"rgba(39,117,202,0.07)", border:"1px solid rgba(39,117,202,0.2)", borderRadius:"6px", marginTop:"0.375rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <p style={{ fontSize:"0.5rem", fontWeight:700, color:"#4A9FE7", fontFamily:"'JetBrains Mono',monospace", margin:"0 0 1px" }}>
            Borrow USDC · {ltv}% LTV
          </p>
          <p style={{ fontSize:"0.46rem", color:"rgba(255,255,255,0.3)", margin:0, fontVariantNumeric:"tabular-nums" }}>
            Max: ${maxUsd.toLocaleString("en-US",{maximumFractionDigits:0})}
          </p>
        </div>
        <button onClick={handleBorrow} disabled={borrowing || done} style={{
          padding:"0.25rem 0.6rem", borderRadius:"5px", border:"none", cursor:"pointer",
          fontSize:"0.52rem", fontWeight:700, fontFamily:"'JetBrains Mono',monospace",
          background: done?"rgba(20,241,149,0.15)":borrowing?"rgba(255,255,255,0.04)":"rgba(39,117,202,0.2)",
          color: done?"#14F195":borrowing?"rgba(255,255,255,0.3)":"#4A9FE7",
        }}>
          {done?"Funded":"Borrow"}
        </button>
      </div>
    </div>
  );
}

// ─── Asset row in vault ───────────────────────────────────────────────────────
function AssetRow({ asset }: { asset: VaultAsset }) {
  const vel = asset.liquidity_velocity;
  const velColor = vel === "high" ? "#14F195" : vel === "medium" ? "#FBBF24" : "rgba(255,255,255,0.3)";
  return (
    <div style={{ padding:"0.35rem 0.45rem", background:"rgba(255,255,255,0.03)", borderRadius:"5px", marginBottom:"0.25rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div style={{ flex:1, minWidth:0 }}>
          <span style={{ fontSize:"0.58rem", color:"rgba(255,255,255,0.7)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"block" }}>{asset.name}</span>
          <span style={{ fontSize:"0.46rem", color:velColor, fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.06em" }}>
            {vel?.toUpperCase() ?? "—"} LIQ
          </span>
        </div>
        <span style={{ fontSize:"0.56rem", fontWeight:700, color:"#C8A96E", fontFamily:"'JetBrains Mono',monospace", fontVariantNumeric:"tabular-nums", flexShrink:0, marginLeft:"0.5rem" }}>
          ${asset.insuranceUsd.toLocaleString("en-US",{maximumFractionDigits:0})}
        </span>
      </div>
      <BorrowPanel asset={asset} />
    </div>
  );
}

// ─── Vault card ───────────────────────────────────────────────────────────────
const SYSTEM_VAULTS = [
  { id:"490", name:"Vault ALPHA-490", agent:"Sophia-Hed" },
  { id:"491", name:"Vault BETA-491",  agent:"Sophia-Reb" },
  { id:"492", name:"Vault GAMMA-492", agent:"Sophia-Yld" },
] as const;

function VaultCard({ vault, assets }: { vault: typeof SYSTEM_VAULTS[number]; assets: VaultAsset[] }) {
  const { vaults }  = useSystemState();
  const sv          = vaults.find(v => v.id === vault.id);
  const vState      = sv?.state ?? "UNPROTECTED";
  const sc          = STATE_CFG[vState];
  const [expanded, setExpanded] = useState(false);

  // Distribute assets across vaults by index mod 3
  const vaultIdx   = SYSTEM_VAULTS.findIndex(v => v.id === vault.id);
  const myAssets   = assets.filter((_, i) => i % 3 === vaultIdx).slice(0, 5);
  const tvl        = myAssets.reduce((s, a) => s + a.insuranceUsd, 0);
  const borrowable = myAssets.filter(a => a.can_borrow);

  return (
    <div style={{ background:sc.bg, border:`1px solid ${sc.border}`, borderRadius:"14px", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ padding:"0.875rem", borderBottom:`1px solid ${sc.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"0.625rem" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.15rem" }}>
              {sv && <CircuitShield vault={sv} />}
              <span style={{ fontWeight:800, fontSize:"0.88rem", color:"#f0f0f0" }}>{vault.name}</span>
            </div>
            <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace" }}>
              Agent: {vault.agent}
            </div>
          </div>
          <div style={{ padding:"0.12rem 0.5rem", borderRadius:"4px", background:`${sc.color}18`, border:`1px solid ${sc.color}30`, fontSize:"0.5rem", fontWeight:700, color:sc.color, letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:"'JetBrains Mono',monospace" }}>
            {sc.label}
          </div>
        </div>

        {/* TVL */}
        <div style={{ marginBottom:"0.5rem" }}>
          <div style={{ fontSize:"0.46rem", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:"'JetBrains Mono',monospace", marginBottom:"1px" }}>Insured Value</div>
          <div style={{ fontWeight:800, fontSize:"1.05rem", fontVariantNumeric:"tabular-nums", fontFamily:"'JetBrains Mono',monospace" }}>
            ${tvl.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
          </div>
          {borrowable.length > 0 && (
            <div style={{ fontSize:"0.48rem", color:"#4A9FE7", fontFamily:"'JetBrains Mono',monospace", marginTop:"1px" }}>
              {borrowable.length} asset{borrowable.length>1?"s":""} eligible for USDC borrow
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display:"flex", gap:"0.375rem" }}>
          <button onClick={() => activateProtection(vault.id, "sovereign_protocol", "circuit_guard")} style={{ flex:1, padding:"0.35rem", borderRadius:"7px", fontSize:"0.58rem", fontWeight:700, background:"rgba(20,241,149,0.1)", border:"1px solid rgba(20,241,149,0.22)", color:"#14F195", cursor:"pointer", fontFamily:"inherit" }}>
            Arm
          </button>
          <button onClick={() => simulateHeliusEvent(vault.id)} style={{ flex:1, padding:"0.35rem", borderRadius:"7px", fontSize:"0.58rem", fontWeight:700, background:"rgba(200,169,110,0.08)", border:"1px solid rgba(200,169,110,0.18)", color:"#C8A96E", cursor:"pointer", fontFamily:"inherit" }}>
            Simulate
          </button>
          <button onClick={() => setExpanded(e => !e)} style={{ flex:1, padding:"0.35rem", borderRadius:"7px", fontSize:"0.58rem", fontWeight:700, background:"rgba(96,165,250,0.08)", border:"1px solid rgba(96,165,250,0.18)", color:"#60A5FA", cursor:"pointer", fontFamily:"inherit" }}>
            {expanded ? "Close" : "Engine"}
          </button>
        </div>
      </div>

      {/* Circuit Engine sub-panel */}
      {expanded && <div style={{ padding:"0 0.875rem 0.875rem" }}><CircuitEngine vaultId={vault.id} /></div>}

      {/* Asset list */}
      {myAssets.length > 0 && (
        <div style={{ padding:"0.625rem 0.875rem 0.875rem" }}>
          <div style={{ fontSize:"0.44rem", color:"rgba(255,255,255,0.22)", textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"'JetBrains Mono',monospace", marginBottom:"0.35rem" }}>
            Protected Assets · $5K Sports Ceiling Enforced
          </div>
          {myAssets.map(a => <AssetRow key={a.id} asset={a} />)}
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function VaultsPage() {
  const { svaults } = { svaults: useSystemState().vaults };
  const [assets, setAssets]   = useState<VaultAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch("/api/cards");
        const data = await res.json();
        if (data.ok) {
          // Enforce $5k sports ceiling
          setAssets(data.assets.filter((a: VaultAsset) =>
            !(a.category === "Sports" && a.insuranceUsd > 5000)
          ));
        }
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (svaults.length === 0 && assets.length > 0) {
      SYSTEM_VAULTS.forEach(v => createSystemVault({ name:v.name, asset:"multi", assetType:"RWA" }));
    }
  }, [svaults.length, assets.length]);

  const totalInsured  = assets.reduce((s, a) => s + a.insuranceUsd, 0);
  const totalBorrowable = assets.filter(a => a.can_borrow).reduce((s, a) => s + (a.borrow_max_usd ?? 0), 0);

  return (
    <div style={{ maxWidth:"960px", margin:"0 auto", padding:"1.5rem 1.25rem 5rem" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>

      <div style={{ marginBottom:"1.5rem" }}>
        <p style={{ fontSize:"0.52rem", letterSpacing:"0.18em", textTransform:"uppercase", color:"rgba(255,255,255,0.22)", fontFamily:"'JetBrains Mono',monospace", marginBottom:"0.2rem" }}>
          Abraxas Protocol · Sovereign Vaults
        </p>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:"0.75rem" }}>
          <h1 style={{ fontWeight:900, fontSize:"clamp(1.4rem,3vw,1.9rem)", letterSpacing:"-0.02em", margin:0 }}>Vault Terminal</h1>
          <div style={{ display:"flex", gap:"1.25rem" }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontWeight:800, fontSize:"1.05rem", color:"#14F195", fontFamily:"'JetBrains Mono',monospace", fontVariantNumeric:"tabular-nums" }}>
                ${totalInsured.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}
              </div>
              <div style={{ fontSize:"0.46rem", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Total Insured</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontWeight:800, fontSize:"1.05rem", color:"#4A9FE7", fontFamily:"'JetBrains Mono',monospace", fontVariantNumeric:"tabular-nums" }}>
                ${totalBorrowable.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}
              </div>
              <div style={{ fontSize:"0.46rem", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Borrow Capacity</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom:"1.25rem" }}><SovereignPulse /></div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,300px),1fr))", gap:"0.875rem" }}>
        {SYSTEM_VAULTS.map(v => <VaultCard key={v.id} vault={v} assets={assets} />)}
      </div>

      <div style={{ marginTop:"1.25rem", padding:"0.625rem 1rem", background:"rgba(212,175,55,0.05)", border:"1px solid rgba(212,175,55,0.15)", borderRadius:"8px", fontFamily:"'JetBrains Mono',monospace", display:"flex", gap:"0.625rem", alignItems:"center" }}>
        <span style={{ fontSize:"0.5rem", fontWeight:700, color:"#D4AF37", letterSpacing:"0.08em", flexShrink:0 }}>LIQUIDITY CEILING</span>
        <span style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.38)" }}>
          Sports assets hard-capped at $5,000. Stocks borrow at 70% LTV. Timepieces at 65% LTV. Metals at 70% LTV.
        </span>
      </div>
    </div>
  );
}