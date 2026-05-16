// FILE: components/CircuitFeed.tsx
// CIRCUIT anomaly telemetry feed. Live-feeling signal stream.
// Driven by deterministic seed + real protocol asset data.
"use client";

import { useState, useEffect } from "react";
import { useAbraStore }        from "@/lib/abraxasStore";

interface Signal {
  id:      string;
  level:   "NOMINAL"|"WATCH"|"ALERT"|"CRITICAL";
  type:    string;
  message: string;
  ts:      number;
}

const LEVEL_COLOR = {
  NOMINAL:  "rgba(20,241,149,0.6)",
  WATCH:    "#FBBF24",
  ALERT:    "#FF8C00",
  CRITICAL: "#f26b6b",
};

const BASE_SIGNALS: Omit<Signal,"id"|"ts">[] = [
  {level:"NOMINAL",  type:"ORACLE",     message:"Price feed consistent across 3 sources"},
  {level:"NOMINAL",  type:"COLLATERAL", message:"Collateral health within normal bounds"},
  {level:"WATCH",    type:"LIQUIDITY",  message:"RWA liquidity depth below 30-day average"},
  {level:"NOMINAL",  type:"CUSTODY",    message:"Custody network response nominal"},
  {level:"WATCH",    type:"VOLATILITY", message:"Metals price variance elevated 4.2%"},
  {level:"NOMINAL",  type:"WALLET",     message:"No suspicious wallet patterns detected"},
  {level:"NOMINAL",  type:"ORACLE",     message:"Pyth feed latency within threshold"},
  {level:"ALERT",    type:"PRICING",    message:"Watch floor price anomaly detected"},
  {level:"NOMINAL",  type:"PROTOCOL",   message:"All state transitions verified on-chain"},
  {level:"WATCH",    type:"EXPOSURE",   message:"Spirits category concentration above 22%"},
];

let seq = 0;
function mkSignal(base:Omit<Signal,"id"|"ts">): Signal {
  return { ...base, id: `SIG-${++seq}`, ts: Date.now() - Math.floor(Math.random()*120_000) };
}

export function CircuitFeed({ limit = 8 }: { limit?: number }) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [tick,    setTick]    = useState(0);
  const assets                = useAbraStore(s=>s.assets);

  useEffect(()=>{
    // Initialize with shuffled base signals
    const init = [...BASE_SIGNALS]
      .sort(()=>Math.random()-0.5)
      .slice(0,limit)
      .map(mkSignal);
    setSignals(init);

    // Add new signal every 12 seconds
    const iv = setInterval(()=>{
      const base = BASE_SIGNALS[Math.floor(Math.random()*BASE_SIGNALS.length)];
      const newSig = mkSignal(base);
      setSignals(s=>[newSig,...s].slice(0,limit));
      setTick(t=>t+1);
    }, 12_000);
    return ()=>clearInterval(iv);
  },[limit]);

  // Inject asset-specific signals when assets exist
  useEffect(()=>{
    if(assets.length===0) return;
    const latest = assets[0];
    const assetSig: Signal = {
      id:      `SIG-A${assets.length}`,
      level:   "NOMINAL",
      type:    "ISSUANCE",
      message: `New position submitted: ${latest.name.slice(0,28)}`,
      ts:      latest.createdAt||Date.now(),
    };
    setSignals(s=>[assetSig,...s].slice(0,limit));
  },[assets.length]);

  if(signals.length===0) return null;

  return (
    <div style={{
      border:"1px solid rgba(20,241,149,0.12)",
      borderRadius:"8px",
      background:"rgba(6,8,16,0.98)",
      overflow:"hidden",
    }}>
      {/* Header */}
      <div style={{
        padding:"0.5rem 1rem",
        borderBottom:"1px solid rgba(20,241,149,0.1)",
        display:"flex",alignItems:"center",justifyContent:"space-between",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#14F195",
            animation:"pulse 1.5s ease-in-out infinite"}}/>
          <span style={{fontSize:"0.44rem",fontWeight:700,color:"rgba(20,241,149,0.7)",
            fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.15em",
            textTransform:"uppercase"}}>CIRCUIT MONITOR</span>
        </div>
        <span style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.2)",
          fontFamily:"'JetBrains Mono',monospace"}}>
          {signals.filter(s=>s.level!=="NOMINAL").length} active flags
        </span>
      </div>

      {/* Signal list */}
      {signals.map((sig,i)=>{
        const col = LEVEL_COLOR[sig.level];
        const age = Math.round((Date.now()-sig.ts)/1000);
        const ageStr = age<60?`${age}s`:age<3600?`${Math.round(age/60)}m`:`${Math.round(age/3600)}h`;
        return(
          <div key={sig.id} style={{
            display:"grid",
            gridTemplateColumns:"60px 90px 1fr 40px",
            padding:"0.45rem 1rem",
            gap:"0.5rem",alignItems:"center",
            borderBottom:i<signals.length-1?"1px solid rgba(255,255,255,0.04)":"none",
            opacity:i===0?1:Math.max(0.4,1-i*0.08),
            transition:"opacity 0.3s",
          }}>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:4,height:4,borderRadius:"50%",
                background:col,flexShrink:0,
                animation:sig.level!=="NOMINAL"?"pulse 1.5s ease-in-out infinite":"none"}}/>
              <span style={{fontSize:"0.3rem",fontWeight:800,color:col,
                fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.08em"}}>
                {sig.level}
              </span>
            </div>
            <span style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.35)",
              fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
              letterSpacing:"0.08em"}}>{sig.type}</span>
            <span style={{fontSize:"0.44rem",color:"rgba(255,255,255,0.6)"}}>
              {sig.message}
            </span>
            <span style={{fontSize:"0.34rem",color:"rgba(255,255,255,0.2)",
              fontFamily:"'JetBrains Mono',monospace",textAlign:"right"}}>{ageStr}</span>
          </div>
        );
      })}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}