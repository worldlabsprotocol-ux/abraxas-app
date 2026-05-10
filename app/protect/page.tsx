// FILE: app/protect/page.tsx  
// Vault Terminal — Loopscale is the hero. Protocol-honest PDA display.
// Loopscale banner at top, then vault cards, then x402, then ABRA CA.
"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { SovereignPulse } from "@/components/SovereignPulse";
import { CircuitShield } from "@/components/CircuitShield";
import {
  useSystemState, activateProtection, simulateHeliusEvent, createSystemVault, VaultState,
} from "@/lib/systemState";
import { getLoopscaleLiquidity } from "@/lib/loopscale";
import { PrizePool } from "@/components/PrizePool";
import { RWACharts } from "@/components/RWACharts";

interface SignalRow { signal: string; value: number; threshold: number; breached: boolean }

const VAULT_ADDRS = [
  { id:"490", name:"VAULT-490", pda:"CQ1UzRrB6C2XV39wZNB7URKwGRhEKkDQgc2xVF5dJGdf", agent:"Sophia-Hed" },
  { id:"491", name:"VAULT-491", pda:"CmWVgyeS8uR9ForuhBPs9vPoQknTMAs8CZuenLiotdDk",  agent:"Sophia-Reb" },
  { id:"492", name:"VAULT-492", pda:"8bBxipDGxTL3B84RSuwxwVysAKreStoHbJKTSHpqfT58", agent:"Sophia-Yld" },
] as const;

const STATE_CFG: Record<VaultState, { color:string; bg:string; border:string; label:string }> = {
  UNPROTECTED:       { color:"#FBBF24", bg:"rgba(251,191,36,0.04)",   border:"rgba(251,191,36,0.14)",   label:"Unprotected" },
  PROTECTED:         { color:"#14F195", bg:"rgba(20,241,149,0.04)",   border:"rgba(20,241,149,0.14)",   label:"Protected"   },
  AT_RISK:           { color:"#fb923c", bg:"rgba(251,146,60,0.05)",   border:"rgba(251,146,60,0.16)",   label:"At Risk"     },
  CIRCUIT_TRIGGERED: { color:"#f26b6b", bg:"rgba(242,107,107,0.05)", border:"rgba(242,107,107,0.16)",  label:"Triggered"   },
};
const RISK_CLR: Record<string,string> = { LOW:"#14F195", MEDIUM:"#FBBF24", HIGH:"#fb923c", CRITICAL:"#f26b6b" };

// ─── Loopscale hero banner ────────────────────────────────────────────────────
const BORROW_EXAMPLES = [
  { label:"Littlemill 1965",          type:"Spirits",   value:45000  },
  { label:"Rolex Submariner",         type:"Watches",   value:14500  },
  { label:"Amazing Fantasy #15",      type:"Comics",    value:900000 },
  { label:"1999 Charizard PSA 10",    type:"Pokemon",   value:550000 },
  { label:"Gold Bar 1oz (XAUt)",      type:"Metals",    value:4733   },
  { label:"NVDA Tokenized Equity",    type:"Stocks",    value:211    },
];

function LoopscaleHero() {
  const [active, setActive] = useState(0);
  const ex = BORROW_EXAMPLES[active];
  const q  = getLoopscaleLiquidity(ex.value, ex.type);

  useEffect(() => {
    const iv = setInterval(() => setActive(a => (a+1) % BORROW_EXAMPLES.length), 3000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ marginBottom:"1.5rem", padding:"1.25rem 1.5rem", background:"linear-gradient(135deg,rgba(20,241,149,0.08),rgba(96,165,250,0.06))", border:"1px solid rgba(20,241,149,0.25)", borderRadius:"14px" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"0.75rem", marginBottom:"1rem" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.3rem" }}>
            <span style={{ fontWeight:900, fontSize:"1.1rem", color:"#14F195" }}>Instant Credit via Loopscale</span>
            <span style={{ fontSize:"0.46rem", fontWeight:700, padding:"0.08rem 0.35rem", borderRadius:"3px", background:"rgba(20,241,149,0.15)", border:"1px solid rgba(20,241,149,0.4)", color:"#14F195", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.08em" }}>LIVE</span>
          </div>
          <p style={{ fontSize:"0.6rem", color:"rgba(255,255,255,0.5)", margin:0, fontFamily:"'JetBrains Mono',monospace" }}>
            Own the asset. Borrow against it. Control your liquidity.
          </p>
        </div>
        <a href="https://loopscale.com" target="_blank" rel="noopener noreferrer" style={{ padding:"0.5rem 1.25rem", borderRadius:"8px", background:"rgba(20,241,149,0.14)", border:"1px solid rgba(20,241,149,0.3)", color:"#14F195", fontSize:"0.68rem", fontWeight:800, textDecoration:"none", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.04em" }}>
          Open Loopscale →
        </a>
      </div>

      {/* Live example rotator */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:"1rem", alignItems:"center", marginBottom:"0.875rem" }}>
        <div style={{ padding:"0.75rem 1rem", background:"rgba(6,8,16,0.9)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"8px" }}>
          <div style={{ fontSize:"0.46rem", color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginBottom:"3px" }}>COLLATERAL</div>
          <div style={{ fontWeight:700, fontSize:"0.78rem", color:"#f0f0f0", marginBottom:"2px", transition:"all 0.3s" }}>{ex.label}</div>
          <div style={{ fontSize:"0.52rem", fontWeight:700, color:"#14F195", fontVariantNumeric:"tabular-nums", fontFamily:"'JetBrains Mono',monospace" }}>
            ${ex.value.toLocaleString("en-US")} value · {Math.round(q.ltv*100)}% LTV
          </div>
        </div>
        <div style={{ textAlign:"center", padding:"0.5rem" }}>
          <div style={{ fontSize:"1.2rem", color:"rgba(20,241,149,0.6)", marginBottom:"0.2rem" }}>→</div>
          <div style={{ fontSize:"0.44rem", color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace" }}>{q.fixedAPR} APR</div>
        </div>
        <div style={{ padding:"0.75rem 1rem", background:"rgba(20,241,149,0.06)", border:"1px solid rgba(20,241,149,0.2)", borderRadius:"8px" }}>
          <div style={{ fontSize:"0.46rem", color:"rgba(20,241,149,0.6)", fontFamily:"'JetBrains Mono',monospace", marginBottom:"3px" }}>INSTANT CREDIT</div>
          <div style={{ fontWeight:900, fontSize:"1.1rem", color:"#14F195", fontVariantNumeric:"tabular-nums", fontFamily:"'JetBrains Mono',monospace" }}>
            ${q.borrowLimit.toLocaleString("en-US")} USDC
          </div>
          <div style={{ fontSize:"0.48rem", color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace" }}>
            ~${q.weeklyPayment}/wk · {q.provider}
          </div>
        </div>
      </div>

      {/* Asset selector dots */}
      <div style={{ display:"flex", gap:"0.4rem", justifyContent:"center" }}>
        {BORROW_EXAMPLES.map((_,i) => (
          <button key={i} onClick={() => setActive(i)} style={{ width:"7px", height:"7px", borderRadius:"50%", border:"none", cursor:"pointer", background:i===active?"#14F195":"rgba(255,255,255,0.18)", transition:"background 0.2s", padding:0 }} />
        ))}
      </div>

      {/* LTV grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:"0.35rem", marginTop:"0.875rem" }}>
        {[
          ["Spirits",   "55%", "#FF8C00"],
          ["Watches",   "65%", "#6b8cff"],
          ["Comics",    "55%", "#a855f7"],
          ["Pokemon",   "55%", "#FBBF24"],
          ["Metals",    "80%", "#D4AF37"],
          ["Stocks",    "70%", "#14F195"],
        ].map(([cat, ltv, color]) => (
          <div key={cat} style={{ padding:"0.35rem 0.5rem", background:"rgba(6,8,16,0.8)", border:`1px solid ${color}22`, borderRadius:"6px", display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.45)", fontFamily:"'JetBrains Mono',monospace" }}>{cat}</span>
            <span style={{ fontSize:"0.52rem", fontWeight:700, color, fontFamily:"'JetBrains Mono',monospace" }}>{ltv} LTV</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Circuit Engine ────────────────────────────────────────────────────────────
function CircuitEngine({ vaultId }: { vaultId: string }) {
  const [result, setResult]   = useState<{ score:number; state:string; signals:SignalRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [yieldOn, setYieldOn] = useState(false);
  const [yieldApy, setYieldApy] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/circuit?vaultId=${vaultId}`);
      const d = await r.json();
      if (d.ok) setResult({ score:d.result.score, state:d.result.state, signals:d.result.signals });
    } catch {} finally { setLoading(false); }
  }, [vaultId]);

  useEffect(() => { load(); const iv = setInterval(load, 30_000); return () => clearInterval(iv); }, [load]);
  useEffect(() => { if (yieldOn) setYieldApy(Math.round((6.4+Math.random()*2.8)*100)/100); }, [yieldOn]);

  const rc = RISK_CLR[result?.state ?? "LOW"] ?? "#14F195";
  return (
    <div style={{ background:"rgba(2,3,10,0.9)", border:`1px solid ${rc}18`, borderRadius:"9px", overflow:"hidden", marginTop:"0.625rem" }}>
      <div style={{ padding:"0.4rem 0.625rem", background:`${rc}07`, borderBottom:`1px solid ${rc}10`, display:"flex", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.3rem" }}>
          <span style={{ width:"5px",height:"5px",borderRadius:"50%",background:rc,animation:"pulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize:"0.46rem",fontWeight:700,color:rc,letterSpacing:"0.12em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace" }}>
            Circuit · {result?.state ?? "SCANNING"}
          </span>
        </div>
        <span style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace" }}>
          {loading?"…":`${result?.score ?? 0}/100`}
        </span>
      </div>
      <div style={{ padding:"0.45rem 0.625rem" }}>
        <div style={{ background:"rgba(255,255,255,0.05)",borderRadius:"2px",height:"2px",marginBottom:"0.4rem" }}>
          <div style={{ width:`${result?.score ?? 0}%`,height:"100%",background:`linear-gradient(90deg,${rc}88,${rc})`,borderRadius:"2px",transition:"width 0.6s" }} />
        </div>
        {result?.signals?.map(s => (
          <div key={s.signal} style={{ display:"grid",gridTemplateColumns:"1fr auto auto",gap:"0.35rem",alignItems:"center",marginBottom:"0.15rem" }}>
            <span style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.32)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.signal}</span>
            <span style={{ fontSize:"0.44rem",color:s.breached?"#f26b6b":"#14F195",fontFamily:"'JetBrains Mono',monospace",fontVariantNumeric:"tabular-nums" }}>{s.value.toFixed(1)}</span>
            <span style={{ fontSize:"0.4rem",color:s.breached?"#f26b6b":"rgba(255,255,255,0.14)",fontFamily:"'JetBrains Mono',monospace" }}>{s.breached?"BREACH":"OK"}</span>
          </div>
        ))}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"0.4rem",padding:"0.3rem 0.4rem",background:"rgba(200,169,110,0.05)",border:"1px solid rgba(200,169,110,0.1)",borderRadius:"5px" }}>
          <div>
            <div style={{ fontSize:"0.46rem",fontWeight:700,color:"#C8A96E",fontFamily:"'JetBrains Mono',monospace" }}>Yield Strategist</div>
            <div style={{ fontSize:"0.42rem",color:"rgba(255,255,255,0.25)" }}>{yieldOn?`${yieldApy}% APY → $ABX`:"Off"}</div>
          </div>
          <button onClick={() => setYieldOn(y=>!y)} style={{ width:"26px",height:"14px",borderRadius:"100px",border:"none",cursor:"pointer",background:yieldOn?"#C8A96E":"rgba(255,255,255,0.08)",position:"relative",flexShrink:0,transition:"background 0.2s" }}>
            <span style={{ position:"absolute",top:"1px",left:yieldOn?"12px":"1px",width:"12px",height:"12px",borderRadius:"50%",background:"#fff",transition:"left 0.2s",display:"block" }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Vault card ───────────────────────────────────────────────────────────────
function VaultCard({ vault }: { vault: typeof VAULT_ADDRS[number] }) {
  const { vaults }    = useSystemState();
  const { publicKey } = useWallet();
  const sv  = vaults.find(v => v.id === vault.id);
  const sc  = STATE_CFG[sv?.state ?? "UNPROTECTED"];
  const [open, setOpen]     = useState(false);
  const [copied, setCopied] = useState(false);
  function copyPda() { navigator.clipboard?.writeText(vault.pda).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),1400); }

  return (
    <div style={{ background:sc.bg,border:`1px solid ${sc.border}`,borderRadius:"12px",overflow:"hidden" }}>
      <div style={{ padding:"0.75rem" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem" }}>
          <div style={{ display:"flex",alignItems:"center",gap:"0.4rem" }}>
            {sv && <CircuitShield vault={sv} />}
            <div>
              <div style={{ fontWeight:800,fontSize:"0.82rem",color:"#f0f0f0" }}>{vault.name}</div>
              <div style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>{vault.agent}</div>
            </div>
          </div>
          <span style={{ padding:"0.1rem 0.4rem",borderRadius:"4px",background:`${sc.color}15`,border:`1px solid ${sc.color}25`,fontSize:"0.46rem",fontWeight:700,color:sc.color,letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace" }}>{sc.label}</span>
        </div>
        <div style={{ padding:"0.3rem 0.4rem",background:"rgba(2,3,10,0.8)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"5px",marginBottom:"0.4rem" }}>
          <div style={{ fontSize:"0.42rem",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"2px" }}>Vault PDA · Mainnet</div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ fontSize:"0.48rem",color:"#6b8cff",fontFamily:"'JetBrains Mono',monospace" }}>{vault.pda.slice(0,14)}…{vault.pda.slice(-5)}</span>
            <div style={{ display:"flex",gap:"0.25rem" }}>
              <button onClick={copyPda} style={{ fontSize:"0.42rem",color:"rgba(255,255,255,0.3)",background:"none",border:"none",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>{copied?"Copied":"Copy"}</button>
              <a href={`https://explorer.solana.com/address/${vault.pda}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:"0.42rem",color:"#6b8cff",textDecoration:"none",fontFamily:"'JetBrains Mono',monospace" }}>Explorer</a>
            </div>
          </div>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.3rem",marginBottom:"0.4rem" }}>
          {[{l:"Oracle",v:"Pyth + Circuit"},{l:"Last Action",v:"risk_eval()"}].map(({l,v})=>(
            <div key={l} style={{ padding:"0.25rem 0.35rem",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:"4px" }}>
              <div style={{ fontSize:"0.4rem",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"1px" }}>{l}</div>
              <div style={{ fontSize:"0.48rem",color:l==="Last Action"?"#14F195":"#f0f0f0",fontFamily:"'JetBrains Mono',monospace" }}>{v}</div>
            </div>
          ))}
        </div>
        {!publicKey && <div style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.22)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.4rem" }}>Connect wallet to view positions.</div>}
        <div style={{ display:"flex",gap:"0.3rem" }}>
          <button onClick={() => activateProtection(vault.id,"sovereign_protocol","circuit_guard")} style={{ flex:1,padding:"0.3rem",borderRadius:"5px",fontSize:"0.54rem",fontWeight:700,background:"rgba(20,241,149,0.08)",border:"1px solid rgba(20,241,149,0.18)",color:"#14F195",cursor:"pointer",fontFamily:"inherit" }}>Arm</button>
          <button onClick={() => simulateHeliusEvent(vault.id)} style={{ flex:1,padding:"0.3rem",borderRadius:"5px",fontSize:"0.54rem",fontWeight:700,background:"rgba(200,169,110,0.07)",border:"1px solid rgba(200,169,110,0.14)",color:"#C8A96E",cursor:"pointer",fontFamily:"inherit" }}>Simulate</button>
          <button onClick={() => setOpen(o=>!o)} style={{ flex:1,padding:"0.3rem",borderRadius:"5px",fontSize:"0.54rem",fontWeight:700,background:"rgba(96,165,250,0.07)",border:"1px solid rgba(96,165,250,0.14)",color:"#60A5FA",cursor:"pointer",fontFamily:"inherit" }}>{open?"Close":"Engine"}</button>
        </div>
      </div>
      {open && <div style={{ padding:"0 0.75rem 0.75rem" }}><CircuitEngine vaultId={vault.id} /></div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function VaultsPage() {
  const { vaults: sv } = useSystemState();
  useEffect(() => {
    if (sv.length === 0) VAULT_ADDRS.forEach(v => createSystemVault({ name:v.name, asset:"multi", assetType:"RWA" }));
  }, [sv.length]);

  return (
    <div style={{ maxWidth:"960px",margin:"0 auto",padding:"1.5rem 1.25rem 5rem" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>

      <div style={{ marginBottom:"1.25rem" }}>
        <p style={{ fontSize:"0.48rem",letterSpacing:"0.18em",textTransform:"uppercase",color:"rgba(255,255,255,0.18)",fontFamily:"'JetBrains Mono',monospace",margin:"0 0 0.2rem" }}>
          Abraxas · Sovereign Lending + On-Chain Vaults
        </p>
        <h1 style={{ fontWeight:900,fontSize:"clamp(1.3rem,3vw,1.8rem)",letterSpacing:"-0.02em",margin:0 }}>Vault Terminal</h1>
      </div>

      {/* ★ LOOPSCALE HERO — top of page */}
      <LoopscaleHero />

      {/* Circuit alerts */}
      <div style={{ marginBottom:"1rem" }}><SovereignPulse /></div>

      {/* Vault authority */}
      <div style={{ padding:"0.4rem 0.625rem",background:"rgba(6,8,16,0.97)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"7px",marginBottom:"1rem",fontFamily:"'JetBrains Mono',monospace",fontSize:"0.46rem",display:"flex",gap:"0.4rem",alignItems:"center" }}>
        <span style={{ color:"rgba(255,255,255,0.22)",textTransform:"uppercase",letterSpacing:"0.06em" }}>Authority:</span>
        <a href="https://explorer.solana.com/address/65JkcHbtaEaJHyNjCF8BxQHcYQub8XwgJnRLDfztiBqA" target="_blank" rel="noopener noreferrer" style={{ color:"#6b8cff",textDecoration:"none" }}>
          65JkcHbtaEaJHyNjCF8BxQHcYQub8XwgJnRLDfztiBqA
        </a>
      </div>

      {/* Vault PDAs */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,290px),1fr))",gap:"0.75rem",marginBottom:"1.5rem" }}>
        {VAULT_ADDRS.map(v => <VaultCard key={v.id} vault={v} />)}
      </div>

      {/* Prize Pool */}
      <PrizePool />

      {/* RWA Charts + Market News */}
      <RWACharts />

      {/* x402 CLI — deeper */}
      <div style={{ padding:"0.875rem 1rem",background:"rgba(96,165,250,0.04)",border:"1px solid rgba(96,165,250,0.12)",borderRadius:"10px",marginBottom:"1rem" }}>
        <div style={{ fontWeight:700,fontSize:"0.7rem",color:"#60A5FA",marginBottom:"0.5rem",fontFamily:"'JetBrains Mono',monospace" }}>x402 · Agentic Micropayment Protocol</div>
        <p style={{ fontSize:"0.52rem",color:"rgba(255,255,255,0.38)",lineHeight:1.65,margin:"0 0 0.625rem" }}>
          x402 is an open payment standard (HTTP 402 Payment Required) that lets AI agents, wallets, and any HTTP client pay for services
          without a pre-existing account. Sophia Agents use x402 to pay for oracle data, hedge execution, Arena antes, and Prize Pool entry
          autonomously. External builders can fund vault positions or enter the Prize Pool by sending a signed USDC transaction in the
          X-Payment header of any POST to Abraxas API endpoints.
        </p>
        <div style={{ background:"rgba(2,3,10,0.97)",border:"1px solid rgba(96,165,250,0.1)",borderRadius:"6px",padding:"0.5rem 0.625rem",fontFamily:"'JetBrains Mono',monospace",fontSize:"0.5rem" }}>
          {[
            { cmd:"x402 pay --to vault-490 --amount 0.001 --token SOL", desc:"# Arena ante" },
            { cmd:"x402 authorize --agent sophia-hed --ops hedge,eval",  desc:"# Agent delegation" },
            { cmd:"x402 status --vault CQ1UzRrB6C2...",                  desc:"# Vault state" },
          ].map(({cmd,desc},i)=>(
            <div key={i} style={{ marginBottom:"0.2rem" }}>
              <span style={{ color:"#60A5FA" }}>{cmd}</span>
              <span style={{ color:"rgba(255,255,255,0.22)",marginLeft:"0.5rem" }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ABRA CA */}
      <div style={{ padding:"0.875rem 1rem",background:"rgba(200,169,110,0.05)",border:"1px solid rgba(200,169,110,0.16)",borderRadius:"10px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.625rem" }}>
          <div>
            <div style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.25)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"0.2rem" }}>$ABRA · Protocol Token · Solana</div>
            <div style={{ fontWeight:700,fontSize:"0.68rem",color:"#C8A96E",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.15rem" }}>5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS</div>
            <div style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>Powers Arena antes, agent fees, and vault yield.</div>
          </div>
          <div style={{ display:"flex",gap:"0.375rem" }}>
            <a href="https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS" target="_blank" rel="noopener noreferrer" style={{ padding:"0.35rem 0.75rem",borderRadius:"6px",fontSize:"0.56rem",fontWeight:700,background:"rgba(255,133,0,0.12)",border:"1px solid rgba(255,133,0,0.25)",color:"#FF8500",textDecoration:"none",fontFamily:"'JetBrains Mono',monospace" }}>Jupiter</a>
            <a href="https://bags.fm/5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS" target="_blank" rel="noopener noreferrer" style={{ padding:"0.35rem 0.75rem",borderRadius:"6px",fontSize:"0.56rem",fontWeight:700,background:"rgba(107,140,255,0.1)",border:"1px solid rgba(107,140,255,0.2)",color:"#6b8cff",textDecoration:"none",fontFamily:"'JetBrains Mono',monospace" }}>Bags</a>
            <a href="https://explorer.solana.com/address/5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS" target="_blank" rel="noopener noreferrer" style={{ padding:"0.35rem 0.75rem",borderRadius:"6px",fontSize:"0.56rem",fontWeight:700,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.38)",textDecoration:"none",fontFamily:"'JetBrains Mono',monospace" }}>Explorer</a>
          </div>
        </div>
      </div>
    </div>
  );
}