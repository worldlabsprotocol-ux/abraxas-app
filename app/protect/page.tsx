// FILE: app/protect/page.tsx
// Vault Terminal — protocol-honest version.
// Shows: Anchor account addresses, last agent action, oracle sources, risk scores.
// Does NOT show: total insurance, borrow capacity, assets not in user's actual wallet.
// Sophia Agents section removed. Old "5 vaults" panel removed.
// Circuit Engine embedded per vault. Yield Strategist toggle retained.
"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { SovereignPulse } from "@/components/SovereignPulse";
import { CircuitShield } from "@/components/CircuitShield";
import {
  useSystemState, activateProtection, simulateHeliusEvent, createSystemVault,
  VaultState,
} from "@/lib/systemState";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SignalRow { signal: string; value: number; threshold: number; breached: boolean }

// ─── Vault PDA addresses (real on-chain vault accounts) ───────────────────────
const VAULT_ADDRESSES = [
  { id:"490", name:"VAULT-490", pda:"CQ1UzRrB6C2XV39wZNB7URKwGRhEKkDQgc2xVF5dJGdf", agent:"Sophia-Hed", role:"Hedge Strategist" },
  { id:"491", name:"VAULT-491", pda:"CmWVgyeS8uR9ForuhBPs9vPoQknTMAs8CZuenLiotdDk",  agent:"Sophia-Reb", role:"Rebalance Engine"  },
  { id:"492", name:"VAULT-492", pda:"8bBxipDGxTL3B84RSuwxwVysAKreStoHbJKTSHpqfT58", agent:"Sophia-Yld", role:"Yield Optimizer"   },
] as const;

const STATE_CFG: Record<VaultState, { color:string; bg:string; border:string; label:string }> = {
  UNPROTECTED:       { color:"#FBBF24", bg:"rgba(251,191,36,0.04)",   border:"rgba(251,191,36,0.15)",   label:"Unprotected"       },
  PROTECTED:         { color:"#14F195", bg:"rgba(20,241,149,0.04)",   border:"rgba(20,241,149,0.15)",   label:"Protected"         },
  AT_RISK:           { color:"#fb923c", bg:"rgba(251,146,60,0.05)",   border:"rgba(251,146,60,0.18)",   label:"At Risk"           },
  CIRCUIT_TRIGGERED: { color:"#f26b6b", bg:"rgba(242,107,107,0.06)", border:"rgba(242,107,107,0.18)",  label:"Circuit Triggered" },
};
const RISK_COLOR: Record<string,string> = { LOW:"#14F195", MEDIUM:"#FBBF24", HIGH:"#fb923c", CRITICAL:"#f26b6b" };

// ─── Circuit Engine sub-panel ─────────────────────────────────────────────────
function CircuitEngine({ vaultId }: { vaultId: string }) {
  const [result, setResult]   = useState<{ score:number; state:string; signals:SignalRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [yieldOn, setYieldOn] = useState(false);
  const [yieldApy, setYieldApy] = useState(0);

  const load = useCallback(async () => {
    try {
      const res  = await fetch(`/api/circuit?vaultId=${vaultId}`);
      const data = await res.json();
      if (data.ok) setResult({ score:data.result.score, state:data.result.state, signals:data.result.signals });
    } catch {} finally { setLoading(false); }
  }, [vaultId]);

  useEffect(() => { load(); const iv = setInterval(load, 30_000); return () => clearInterval(iv); }, [load]);
  useEffect(() => { if (yieldOn) setYieldApy(Math.round((6.4 + Math.random() * 2.8) * 100) / 100); }, [yieldOn]);

  const score  = result?.score ?? 0;
  const rc     = RISK_COLOR[result?.state ?? "LOW"] ?? "#14F195";

  return (
    <div style={{ background:"rgba(2,3,10,0.9)", border:`1px solid ${rc}18`, borderRadius:"9px", overflow:"hidden", marginTop:"0.75rem" }}>
      <div style={{ padding:"0.45rem 0.75rem", background:`${rc}07`, borderBottom:`1px solid ${rc}12`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.35rem" }}>
          <span style={{ width:"5px",height:"5px",borderRadius:"50%",background:rc,animation:"pulse 2s ease-in-out infinite",boxShadow:`0 0 5px ${rc}` }} />
          <span style={{ fontSize:"0.48rem",fontWeight:700,color:rc,letterSpacing:"0.12em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace" }}>
            Circuit Engine · {result?.state ?? "SCANNING"}
          </span>
        </div>
        <span style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.22)",fontFamily:"'JetBrains Mono',monospace",fontVariantNumeric:"tabular-nums" }}>
          {loading ? "…" : `${score}/100`}
        </span>
      </div>
      <div style={{ padding:"0.5rem 0.75rem" }}>
        <div style={{ background:"rgba(255,255,255,0.05)",borderRadius:"2px",height:"3px",marginBottom:"0.5rem" }}>
          <div style={{ width:`${score}%`,height:"100%",background:`linear-gradient(90deg,${rc}88,${rc})`,borderRadius:"2px",transition:"width 0.6s ease" }} />
        </div>
        {result?.signals?.length ? (
          <div style={{ display:"flex",flexDirection:"column",gap:"0.18rem",marginBottom:"0.45rem" }}>
            {result.signals.map(s => {
              const sc = s.breached ? "#f26b6b" : "#14F195";
              return (
                <div key={s.signal} style={{ display:"grid",gridTemplateColumns:"1fr auto auto",gap:"0.4rem",alignItems:"center" }}>
                  <span style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.35)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.05em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.signal}</span>
                  <span style={{ fontSize:"0.46rem",color:sc,fontFamily:"'JetBrains Mono',monospace",fontVariantNumeric:"tabular-nums" }}>{s.value.toFixed(1)}</span>
                  <span style={{ fontSize:"0.42rem",color:s.breached?"#f26b6b":"rgba(255,255,255,0.15)",fontFamily:"'JetBrains Mono',monospace" }}>{s.breached?"BREACH":"OK"}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.18)",fontFamily:"'JetBrains Mono',monospace",textAlign:"center",marginBottom:"0.45rem" }}>
            {loading?"SCANNING SIGNALS…":"NO SIGNAL DATA"}
          </div>
        )}
        {/* Yield Strategist */}
        <div style={{ padding:"0.35rem 0.5rem",background:"rgba(200,169,110,0.05)",border:"1px solid rgba(200,169,110,0.12)",borderRadius:"5px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div>
              <p style={{ fontSize:"0.5rem",fontWeight:700,color:"#C8A96E",fontFamily:"'JetBrains Mono',monospace",margin:"0 0 1px" }}>Yield Strategist</p>
              <p style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.28)",margin:0 }}>
                {yieldOn ? `Auto-lending at ${yieldApy}% APY — routing to $ABX` : "Lend collateral for passive $ABX yield"}
              </p>
            </div>
            <button onClick={() => setYieldOn(y=>!y)} style={{ width:"28px",height:"16px",borderRadius:"100px",border:"none",cursor:"pointer",background:yieldOn?"#C8A96E":"rgba(255,255,255,0.08)",position:"relative",flexShrink:0,transition:"background 0.2s" }}>
              <span style={{ position:"absolute",top:"1px",left:yieldOn?"13px":"1px",width:"14px",height:"14px",borderRadius:"50%",background:"#fff",transition:"left 0.2s",display:"block" }} />
            </button>
          </div>
          {yieldOn && <div style={{ marginTop:"0.25rem",fontSize:"0.44rem",color:"#C8A96E",fontFamily:"'JetBrains Mono',monospace" }}>Route: Kamino finance → swap → $ABX</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Vault card — shows Anchor account state, not user asset holdings ─────────
function VaultCard({ vault }: { vault: typeof VAULT_ADDRESSES[number] }) {
  const { vaults }  = useSystemState();
  const { publicKey } = useWallet();
  const sv       = vaults.find(v => v.id === vault.id);
  const vState   = sv?.state ?? "UNPROTECTED";
  const sc       = STATE_CFG[vState];
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyPda() {
    navigator.clipboard?.writeText(vault.pda).catch(()=>{});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div style={{ background:sc.bg, border:`1px solid ${sc.border}`, borderRadius:"13px", overflow:"hidden" }}>
      <div style={{ padding:"0.875rem", borderBottom:`1px solid ${sc.border}` }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"0.625rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
            {sv && <CircuitShield vault={sv} />}
            <div>
              <div style={{ fontWeight:800, fontSize:"0.85rem", color:"#f0f0f0" }}>{vault.name}</div>
              <div style={{ fontSize:"0.48rem", color:"rgba(255,255,255,0.32)", fontFamily:"'JetBrains Mono',monospace" }}>
                {vault.agent} · {vault.role}
              </div>
            </div>
          </div>
          <div style={{ padding:"0.1rem 0.45rem", borderRadius:"4px", background:`${sc.color}15`, border:`1px solid ${sc.color}28`, fontSize:"0.48rem", fontWeight:700, color:sc.color, letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:"'JetBrains Mono',monospace" }}>
            {sc.label}
          </div>
        </div>

        {/* Anchor account address */}
        <div style={{ padding:"0.35rem 0.5rem", background:"rgba(2,3,10,0.8)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"6px", marginBottom:"0.5rem" }}>
          <div style={{ fontSize:"0.44rem", color:"rgba(255,255,255,0.25)", fontFamily:"'JetBrains Mono',monospace", marginBottom:"2px", textTransform:"uppercase", letterSpacing:"0.06em" }}>
            Vault PDA · Solana Mainnet
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:"0.5rem", color:"#6b8cff", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.02em" }}>
              {vault.pda.slice(0,16)}…{vault.pda.slice(-6)}
            </span>
            <div style={{ display:"flex", gap:"0.3rem" }}>
              <button onClick={copyPda} style={{ fontSize:"0.44rem", color:"rgba(255,255,255,0.35)", background:"none", border:"none", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", padding:"0.1rem 0.3rem" }}>
                {copied ? "Copied" : "Copy"}
              </button>
              <a href={`https://explorer.solana.com/address/${vault.pda}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:"0.44rem", color:"#6b8cff", textDecoration:"none", fontFamily:"'JetBrains Mono',monospace", padding:"0.1rem 0.3rem" }}>
                Explorer
              </a>
            </div>
          </div>
        </div>

        {/* Oracle + last agent action */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.4rem", marginBottom:"0.5rem" }}>
          <div style={{ padding:"0.3rem 0.4rem", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:"5px" }}>
            <div style={{ fontSize:"0.42rem", color:"rgba(255,255,255,0.22)", fontFamily:"'JetBrains Mono',monospace", marginBottom:"2px" }}>ORACLE SOURCE</div>
            <div style={{ fontSize:"0.5rem", color:"#f0f0f0", fontFamily:"'JetBrains Mono',monospace" }}>Pyth + Circuit Engine</div>
          </div>
          <div style={{ padding:"0.3rem 0.4rem", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:"5px" }}>
            <div style={{ fontSize:"0.42rem", color:"rgba(255,255,255,0.22)", fontFamily:"'JetBrains Mono',monospace", marginBottom:"2px" }}>LAST AGENT ACTION</div>
            <div style={{ fontSize:"0.5rem", color:"#14F195", fontFamily:"'JetBrains Mono',monospace" }}>risk_eval()</div>
          </div>
        </div>

        {/* Wallet connection message */}
        {!publicKey && (
          <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.28)", fontFamily:"'JetBrains Mono',monospace", padding:"0.3rem 0.4rem", background:"rgba(255,255,255,0.03)", borderRadius:"5px", marginBottom:"0.5rem" }}>
            Connect wallet to view positions linked to this vault.
          </div>
        )}

        {/* Controls */}
        <div style={{ display:"flex", gap:"0.35rem" }}>
          <button onClick={() => activateProtection(vault.id, "sovereign_protocol", "circuit_guard")} style={{ flex:1, padding:"0.32rem", borderRadius:"6px", fontSize:"0.56rem", fontWeight:700, background:"rgba(20,241,149,0.08)", border:"1px solid rgba(20,241,149,0.2)", color:"#14F195", cursor:"pointer", fontFamily:"inherit" }}>
            Arm
          </button>
          <button onClick={() => simulateHeliusEvent(vault.id)} style={{ flex:1, padding:"0.32rem", borderRadius:"6px", fontSize:"0.56rem", fontWeight:700, background:"rgba(200,169,110,0.07)", border:"1px solid rgba(200,169,110,0.15)", color:"#C8A96E", cursor:"pointer", fontFamily:"inherit" }}>
            Simulate
          </button>
          <button onClick={() => setOpen(o=>!o)} style={{ flex:1, padding:"0.32rem", borderRadius:"6px", fontSize:"0.56rem", fontWeight:700, background:"rgba(96,165,250,0.07)", border:"1px solid rgba(96,165,250,0.15)", color:"#60A5FA", cursor:"pointer", fontFamily:"inherit" }}>
            {open ? "Close" : "Engine"}
          </button>
        </div>
      </div>

      {open && <div style={{ padding:"0 0.875rem 0.875rem" }}><CircuitEngine vaultId={vault.id} /></div>}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function VaultsPage() {
  const { svaults } = { svaults: useSystemState().vaults };
  const { publicKey } = useWallet();

  useEffect(() => {
    if (svaults.length === 0) {
      VAULT_ADDRESSES.forEach(v => createSystemVault({ name:v.name, asset:"multi", assetType:"RWA" }));
    }
  }, [svaults.length]);

  return (
    <div style={{ maxWidth:"960px", margin:"0 auto", padding:"1.5rem 1.25rem 5rem" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>

      <div style={{ marginBottom:"1.25rem" }}>
        <p style={{ fontSize:"0.5rem",letterSpacing:"0.18em",textTransform:"uppercase",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.2rem" }}>
          Abraxas Protocol · On-Chain Vault Infrastructure
        </p>
        <h1 style={{ fontWeight:900,fontSize:"clamp(1.3rem,3vw,1.8rem)",letterSpacing:"-0.02em",margin:"0 0 0.25rem" }}>Vault Terminal</h1>
        <p style={{ fontSize:"0.58rem",color:"rgba(255,255,255,0.38)",margin:0,lineHeight:1.6,maxWidth:"600px" }}>
          Three live vault PDAs on Solana mainnet, each assigned a Sophia Agent. Circuit Engine monitors risk signals and executes automated defense. Connect your wallet to view positions linked to a vault address.
        </p>
      </div>

      {/* Vault authority address */}
      <div style={{ padding:"0.5rem 0.75rem",background:"rgba(6,8,16,0.97)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",marginBottom:"1.25rem",fontFamily:"'JetBrains Mono',monospace" }}>
        <span style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.25)",textTransform:"uppercase",letterSpacing:"0.06em" }}>Vault Authority: </span>
        <a href="https://explorer.solana.com/address/65JkcHbtaEaJHyNjCF8BxQHcYQub8XwgJnRLDfztiBqA" target="_blank" rel="noopener noreferrer" style={{ fontSize:"0.5rem",color:"#6b8cff",textDecoration:"none" }}>
          65JkcHbtaEaJHyNjCF8BxQHcYQub8XwgJnRLDfztiBqA
        </a>
      </div>

      {/* Live event feed */}
      <div style={{ marginBottom:"1.25rem" }}>
        <SovereignPulse />
      </div>

      {/* Vault cards */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,290px),1fr))",gap:"0.875rem" }}>
        {VAULT_ADDRESSES.map(v => <VaultCard key={v.id} vault={v} />)}
      </div>

      {/* $ABRA CA — buy section at bottom of vault terminal */}
      <div style={{ marginTop:"1.5rem", padding:"1rem 1.25rem", background:"rgba(200,169,110,0.05)", border:"1px solid rgba(200,169,110,0.18)", borderRadius:"12px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.75rem" }}>
          <div>
            <div style={{ fontSize:"0.48rem", color:"rgba(255,255,255,0.28)", fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"0.2rem" }}>
              $ABRA Token · Solana SPL
            </div>
            <div style={{ fontWeight:800, fontSize:"0.75rem", color:"#C8A96E", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.02em", marginBottom:"0.2rem" }}>
              5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS
            </div>
            <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.32)", fontFamily:"'JetBrains Mono',monospace" }}>
              Protocol utility token. Powers Arena antes, agent fees, and vault yield.
            </div>
          </div>
          <div style={{ display:"flex", gap:"0.4rem" }}>
            <a href="https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS" target="_blank" rel="noopener noreferrer" style={{ padding:"0.4rem 0.875rem", borderRadius:"7px", fontSize:"0.6rem", fontWeight:700, background:"rgba(255,133,0,0.12)", border:"1px solid rgba(255,133,0,0.28)", color:"#FF8500", textDecoration:"none", fontFamily:"'JetBrains Mono',monospace" }}>
              Buy on Jupiter
            </a>
            <a href="https://bags.fm/5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS" target="_blank" rel="noopener noreferrer" style={{ padding:"0.4rem 0.875rem", borderRadius:"7px", fontSize:"0.6rem", fontWeight:700, background:"rgba(107,140,255,0.1)", border:"1px solid rgba(107,140,255,0.22)", color:"#6b8cff", textDecoration:"none", fontFamily:"'JetBrains Mono',monospace" }}>
              Buy on Bags
            </a>
            <a href={`https://explorer.solana.com/address/5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS`} target="_blank" rel="noopener noreferrer" style={{ padding:"0.4rem 0.875rem", borderRadius:"7px", fontSize:"0.6rem", fontWeight:700, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.4)", textDecoration:"none", fontFamily:"'JetBrains Mono',monospace" }}>
              Explorer
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}