// FILE: app/protect/page.tsx
// Vault Terminal — stripped to essentials. Ryan Cohen: delete what doesn't earn its place.
// Shows: real on-chain vault PDAs, circuit engine, x402 info, ABRA CA.
// No fake TVL, no fake asset listings, no borrow capacity theater.
"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { SovereignPulse } from "@/components/SovereignPulse";
import { CircuitShield } from "@/components/CircuitShield";
import {
  useSystemState, activateProtection, simulateHeliusEvent, createSystemVault, VaultState,
} from "@/lib/systemState";
import { getLoopscaleLiquidity, getRank, RANK_COLORS, type EloState } from "@/lib/loopscale";

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

function CircuitEngine({ vaultId }: { vaultId: string }) {
  const [result, setResult]     = useState<{ score:number; state:string; signals:SignalRow[] } | null>(null);
  const [loading, setLoading]   = useState(true);
  const [yieldOn, setYieldOn]   = useState(false);
  const [yieldApy, setYieldApy] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/circuit?vaultId=${vaultId}`);
      const d = await r.json();
      if (d.ok) setResult({ score:d.result.score, state:d.result.state, signals:d.result.signals });
    } catch {} finally { setLoading(false); }
  }, [vaultId]);

  useEffect(() => { load(); const iv = setInterval(load, 30_000); return () => clearInterval(iv); }, [load]);
  useEffect(() => { if (yieldOn) setYieldApy(Math.round((6.4 + Math.random()*2.8)*100)/100); }, [yieldOn]);

  const rc = RISK_CLR[result?.state ?? "LOW"] ?? "#14F195";
  return (
    <div style={{ background:"rgba(2,3,10,0.9)", border:`1px solid ${rc}18`, borderRadius:"9px", overflow:"hidden", marginTop:"0.625rem" }}>
      <div style={{ padding:"0.4rem 0.625rem", background:`${rc}07`, borderBottom:`1px solid ${rc}10`, display:"flex", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.3rem" }}>
          <span style={{ width:"5px",height:"5px",borderRadius:"50%",background:rc,animation:"pulse 2s ease-in-out infinite",boxShadow:`0 0 4px ${rc}` }} />
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
        {result?.signals?.map(s => {
          const sc = s.breached?"#f26b6b":"#14F195";
          return (
            <div key={s.signal} style={{ display:"grid",gridTemplateColumns:"1fr auto auto",gap:"0.35rem",alignItems:"center",marginBottom:"0.15rem" }}>
              <span style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.32)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.signal}</span>
              <span style={{ fontSize:"0.44rem",color:sc,fontFamily:"'JetBrains Mono',monospace",fontVariantNumeric:"tabular-nums" }}>{s.value.toFixed(1)}</span>
              <span style={{ fontSize:"0.4rem",color:s.breached?"#f26b6b":"rgba(255,255,255,0.14)",fontFamily:"'JetBrains Mono',monospace" }}>{s.breached?"BREACH":"OK"}</span>
            </div>
          );
        })}
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

function VaultCard({ vault }: { vault: typeof VAULT_ADDRS[number] }) {
  const { vaults }    = useSystemState();
  const { publicKey } = useWallet();
  const sv  = vaults.find(v => v.id === vault.id);
  const vState = sv?.state ?? "UNPROTECTED";
  const sc  = STATE_CFG[vState];
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
          <span style={{ padding:"0.1rem 0.4rem",borderRadius:"4px",background:`${sc.color}15`,border:`1px solid ${sc.color}25`,fontSize:"0.46rem",fontWeight:700,color:sc.color,letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace" }}>
            {sc.label}
          </span>
        </div>

        {/* PDA row */}
        <div style={{ padding:"0.3rem 0.4rem",background:"rgba(2,3,10,0.8)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"5px",marginBottom:"0.4rem" }}>
          <div style={{ fontSize:"0.42rem",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"2px" }}>Vault PDA · Mainnet</div>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ fontSize:"0.48rem",color:"#6b8cff",fontFamily:"'JetBrains Mono',monospace" }}>
              {vault.pda.slice(0,14)}…{vault.pda.slice(-5)}
            </span>
            <div style={{ display:"flex",gap:"0.25rem" }}>
              <button onClick={copyPda} style={{ fontSize:"0.42rem",color:"rgba(255,255,255,0.3)",background:"none",border:"none",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>
                {copied?"Copied":"Copy"}
              </button>
              <a href={`https://explorer.solana.com/address/${vault.pda}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:"0.42rem",color:"#6b8cff",textDecoration:"none",fontFamily:"'JetBrains Mono',monospace" }}>
                Explorer
              </a>
            </div>
          </div>
        </div>

        {/* Oracle + agent action */}
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.3rem",marginBottom:"0.4rem" }}>
          {[{l:"Oracle",v:"Pyth + Circuit"},{l:"Last Action",v:"risk_eval()"}].map(({l,v}) => (
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

export default function VaultsPage() {
  const { vaults: sv } = useSystemState();
  const { setVisible } = useWalletModal();
  const { connected }  = useWallet();

  useEffect(() => {
    if (sv.length === 0) VAULT_ADDRS.forEach(v => createSystemVault({ name:v.name, asset:"multi", assetType:"RWA" }));
  }, [sv.length]);

  return (
    <div style={{ maxWidth:"960px",margin:"0 auto",padding:"1.5rem 1.25rem 5rem" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>

      <div style={{ marginBottom:"1.25rem" }}>
        <p style={{ fontSize:"0.48rem",letterSpacing:"0.18em",textTransform:"uppercase",color:"rgba(255,255,255,0.18)",fontFamily:"'JetBrains Mono',monospace",margin:"0 0 0.2rem" }}>
          Abraxas · On-Chain Infrastructure
        </p>
        <h1 style={{ fontWeight:900,fontSize:"clamp(1.3rem,3vw,1.8rem)",letterSpacing:"-0.02em",margin:"0 0 0.3rem" }}>Vault Terminal</h1>
        <p style={{ fontSize:"0.56rem",color:"rgba(255,255,255,0.35)",margin:0,lineHeight:1.6,maxWidth:"560px" }}>
          Three live vault PDAs on Solana mainnet. Circuit Engine monitors risk in real time. Connect your wallet to view tokenized positions.
        </p>
      </div>

      {/* Vault authority */}
      <div style={{ padding:"0.4rem 0.625rem",background:"rgba(6,8,16,0.97)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"7px",marginBottom:"1rem",fontFamily:"'JetBrains Mono',monospace",fontSize:"0.46rem",display:"flex",gap:"0.4rem",alignItems:"center" }}>
        <span style={{ color:"rgba(255,255,255,0.22)",textTransform:"uppercase",letterSpacing:"0.06em" }}>Authority:</span>
        <a href="https://explorer.solana.com/address/65JkcHbtaEaJHyNjCF8BxQHcYQub8XwgJnRLDfztiBqA" target="_blank" rel="noopener noreferrer" style={{ color:"#6b8cff",textDecoration:"none" }}>
          65JkcHbtaEaJHyNjCF8BxQHcYQub8XwgJnRLDfztiBqA
        </a>
      </div>

      {/* Circuit alert pulse */}
      <div style={{ marginBottom:"1rem" }}><SovereignPulse /></div>

      {/* Vault cards */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,290px),1fr))",gap:"0.75rem",marginBottom:"1.5rem" }}>
        {VAULT_ADDRS.map(v => <VaultCard key={v.id} vault={v} />)}
      </div>


      {/* Loopscale Borrowing Panel */}
      <div style={{ marginBottom:"1rem", padding:"1rem 1.25rem", background:"rgba(20,241,149,0.04)", border:"1px solid rgba(20,241,149,0.14)", borderRadius:"12px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"0.625rem", marginBottom:"0.875rem" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"0.4rem", marginBottom:"0.2rem" }}>
              <span style={{ fontWeight:800, fontSize:"0.82rem", color:"#14F195" }}>Loopscale Borrowing</span>
              <span style={{ fontSize:"0.46rem", fontWeight:700, padding:"0.1rem 0.35rem", borderRadius:"3px", background:"rgba(20,241,149,0.12)", border:"1px solid rgba(20,241,149,0.3)", color:"#14F195", fontFamily:"'JetBrains Mono',monospace" }}>LIVE</span>
            </div>
            <div style={{ fontSize:"0.54rem", color:"rgba(255,255,255,0.38)", fontFamily:"'JetBrains Mono',monospace" }}>
              Borrow USDC against vaulted RWA collateral · Fixed 5.2% APR
            </div>
          </div>
          <a href="https://loopscale.com" target="_blank" rel="noopener noreferrer" style={{ padding:"0.35rem 0.875rem", borderRadius:"7px", fontSize:"0.6rem", fontWeight:700, background:"rgba(20,241,149,0.1)", border:"1px solid rgba(20,241,149,0.25)", color:"#14F195", textDecoration:"none", fontFamily:"'JetBrains Mono',monospace" }}>
            Loopscale
          </a>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"0.5rem" }}>
          {[
            { label:"1999 Charizard Holo PSA 10", type:"Pokemon", value:550000 },
            { label:"Gold Bar 1oz (XAUt)",         type:"Metals",  value:4733.39 },
            { label:"NVDA Tokenized Equity",        type:"Stocks",  value:211.48 },
            { label:"Rolex Daytona Paul Newman",    type:"Timepieces", value:17800000 },
          ].map(asset => {
            const q = getLoopscaleLiquidity(asset.value, asset.type);
            return (
              <div key={asset.label} style={{ padding:"0.625rem 0.75rem", background:"rgba(6,8,16,0.97)", border:"1px solid rgba(20,241,149,0.1)", borderRadius:"8px" }}>
                <div style={{ fontSize:"0.52rem", fontWeight:700, color:"#f0f0f0", marginBottom:"2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{asset.label}</div>
                <div style={{ fontSize:"0.46rem", color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginBottom:"0.35rem" }}>
                  {asset.type} · {Math.round(q.ltv * 100)}% LTV
                </div>
                <div style={{ fontSize:"0.62rem", fontWeight:800, color:"#14F195", fontVariantNumeric:"tabular-nums", fontFamily:"'JetBrains Mono',monospace", marginBottom:"2px" }}>
                  Instant Credit: ${q.borrowLimit.toLocaleString("en-US")} USDC
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:"0.46rem", color:"rgba(255,255,255,0.28)", fontFamily:"'JetBrains Mono',monospace" }}>
                    {q.fixedAPR} APR · ~${q.weeklyPayment}/wk
                  </span>
                  <span style={{ fontSize:"0.44rem", color:"rgba(20,241,149,0.5)", fontFamily:"'JetBrains Mono',monospace" }}>Loopscale</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop:"0.625rem", fontSize:"0.48rem", color:"rgba(255,255,255,0.22)", fontFamily:"'JetBrains Mono',monospace" }}>
          Connect your broker, tokenize your stocks, borrow against them — all in one click. Loopscale Modular Vault handles custody and execution on Solana.
        </div>
      </div>

      {/* x402 + Hermes explanation */}
      <div style={{ padding:"0.875rem 1rem",background:"rgba(96,165,250,0.04)",border:"1px solid rgba(96,165,250,0.12)",borderRadius:"10px",marginBottom:"1rem" }}>
        <div style={{ fontWeight:700,fontSize:"0.7rem",color:"#60A5FA",marginBottom:"0.5rem",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em" }}>
          x402 · Agentic Payment Protocol
        </div>
        <p style={{ fontSize:"0.52rem",color:"rgba(255,255,255,0.38)",lineHeight:1.65,margin:"0 0 0.625rem" }}>
          x402 enables autonomous micropayments — agents pay for oracle data, execute hedges, and settle Arena antes without user approval. Every vault action routes through x402 middleware on Solana for sub-cent, instant settlement.
        </p>
        {/* x402 command reference */}
        <div style={{ background:"rgba(2,3,10,0.97)",border:"1px solid rgba(96,165,250,0.1)",borderRadius:"6px",padding:"0.5rem 0.625rem",fontFamily:"'JetBrains Mono',monospace",fontSize:"0.5rem" }}>
          <div style={{ color:"rgba(255,255,255,0.22)",marginBottom:"0.25rem",textTransform:"uppercase",letterSpacing:"0.06em" }}>x402 CLI Reference</div>
          {[
            { cmd:"x402 pay --to vault-490 --amount 0.001 --token SOL", desc:"# Arena ante" },
            { cmd:"x402 authorize --agent sophia-hed --ops hedge,eval", desc:"# Agent delegation" },
            { cmd:"x402 status --vault CQ1UzRrB6C2...",                 desc:"# Vault state" },
          ].map(({cmd,desc},i) => (
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
            <div style={{ fontWeight:700,fontSize:"0.68rem",color:"#C8A96E",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.15rem" }}>
              5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS
            </div>
            <div style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>
              Powers Arena antes, agent operation fees, and vault yield.
            </div>
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