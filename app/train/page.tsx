// FILE: app/train/page.tsx
// Sophia Agents + Circuit On-Chain Safety — AI Guardian Protocol.
// Fixes the 404. Self-contained — no broken imports.
"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";

const MONO = "'JetBrains Mono',monospace";

// Simulated Sophia agent decisions
const SOPHIA_DECISIONS = [
  { ts:0,     agent:"SOPHIA-1", action:"REBALANCE",         detail:"Collateral ratio optimized — metals allocation increased 8%",  color:"#14F195" },
  { ts:3000,  agent:"SOPHIA-2", action:"YIELD_CAPTURE",     detail:"Idle verified position deployed to Loopscale — 5.2% APR",     color:"#14F195" },
  { ts:6500,  agent:"SOPHIA-3", action:"RISK_HEDGE",        detail:"Volatility threshold exceeded — hedge position initiated",       color:"#FBBF24" },
  { ts:10000, agent:"CIRCUIT",  action:"ANOMALY_DETECTED",  detail:"Watch floor price deviation 4.2% — monitoring elevated",        color:"#FF8C00" },
  { ts:13500, agent:"SOPHIA-1", action:"CUSTODY_VERIFIED",  detail:"Quarterly audit confirmed — Brinks vault Singapore cleared",    color:"#14F195" },
  { ts:17000, agent:"CIRCUIT",  action:"CIRCUIT_NOMINAL",   detail:"All risk parameters within bounds — no action required",        color:"rgba(20,241,149,0.6)" },
  { ts:21000, agent:"SOPHIA-2", action:"PROVENANCE_UPDATE", detail:"New appraisal anchored — collateral score revised to 88/100",  color:"#C8A96E" },
];

const SOPHIA_FEATURES = [
  { icon:"◈", label:"Yield Optimization",    desc:"Continuously monitors protocol rates and deploys idle verified positions to the highest-yield lending opportunity within risk parameters." },
  { icon:"◉", label:"Dynamic Rebalancing",   desc:"Adjusts collateral ratios and portfolio composition automatically as market conditions change, maintaining health factor targets." },
  { icon:"◆", label:"Provenance Monitoring", desc:"Tracks custody audit schedules and requests fresh appraisals before verification certificates approach expiry thresholds." },
  { icon:"⬡", label:"Risk Hedging",          desc:"Initiates partial hedge positions when volatility signals exceed configured thresholds, protecting borrowing positions from liquidation." },
];

const CIRCUIT_SIGNALS = [
  { level:"NOMINAL", type:"ORACLE",     msg:"Price feeds consistent across 3 verified sources",    col:"rgba(20,241,149,0.65)" },
  { level:"NOMINAL", type:"COLLATERAL", msg:"Portfolio health factor 1.48 — above threshold",      col:"rgba(20,241,149,0.65)" },
  { level:"WATCH",   type:"LIQUIDITY",  msg:"Watch category liquidity depth below 30d average",    col:"#FBBF24" },
  { level:"NOMINAL", type:"CUSTODY",    msg:"All custody vaults nominal — 0 overdue audits",       col:"rgba(20,241,149,0.65)" },
  { level:"WATCH",   type:"VOLATILITY", msg:"Metals variance elevated — monitoring intensified",   col:"#FBBF24" },
  { level:"NOMINAL", type:"CIRCUIT",    msg:"Automatic circuit breakers armed — no triggers",      col:"rgba(20,241,149,0.65)" },
];

function AgentFeed() {
  const [visible, setVisible] = useState<typeof SOPHIA_DECISIONS>([]);

  useEffect(() => {
    SOPHIA_DECISIONS.forEach((d, i) => {
      setTimeout(() => setVisible(v => [d, ...v]), d.ts + i * 100);
    });
  }, []);

  return (
    <div style={{
      border:"1px solid rgba(20,241,149,0.12)", borderRadius:"8px",
      overflow:"hidden", height:320, display:"flex", flexDirection:"column",
    }}>
      <div style={{ padding:"0.625rem 1rem", borderBottom:"1px solid rgba(20,241,149,0.08)",
                    background:"rgba(20,241,149,0.04)",
                    display:"flex", alignItems:"center", gap:"0.5rem" }}>
        <div style={{ width:6, height:6, borderRadius:"50%", background:"#14F195",
                      animation:"pulse 1.5s ease-in-out infinite" }}/>
        <span style={{ fontSize:"0.44rem", fontWeight:700,
                       color:"rgba(20,241,149,0.7)", fontFamily:MONO,
                       letterSpacing:"0.12em", textTransform:"uppercase" }}>
          Sophia Agent Decision Log · Live
        </span>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"0.625rem 0" }}>
        {visible.map((d, i) => (
          <div key={i} style={{
            display:"grid", gridTemplateColumns:"80px 120px 1fr",
            padding:"0.4rem 1rem", gap:"0.5rem", alignItems:"center",
            borderBottom:"1px solid rgba(255,255,255,0.04)",
          }}>
            <span style={{ fontSize:"0.36rem", fontWeight:700, color:"rgba(255,255,255,0.35)",
                           fontFamily:MONO }}>{d.agent}</span>
            <span style={{ fontSize:"0.36rem", fontWeight:800, color:d.color,
                           fontFamily:MONO, textTransform:"uppercase",
                           letterSpacing:"0.06em" }}>{d.action}</span>
            <span style={{ fontSize:"0.44rem", color:"rgba(255,255,255,0.55)" }}>
              {d.detail}
            </span>
          </div>
        ))}
        {visible.length === 0 && (
          <div style={{ padding:"1rem", fontSize:"0.48rem",
                        color:"rgba(255,255,255,0.2)", textAlign:"center",
                        fontFamily:MONO }}>
            Initializing agents…
          </div>
        )}
      </div>
    </div>
  );
}

function CircuitFeed() {
  const [signals, setSignals] = useState(CIRCUIT_SIGNALS.slice(0,4));
  useEffect(() => {
    const iv = setInterval(() => {
      const s = CIRCUIT_SIGNALS[Math.floor(Math.random() * CIRCUIT_SIGNALS.length)];
      setSignals(prev => [s, ...prev].slice(0, 5));
    }, 12000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{
      border:"1px solid rgba(255,133,0,0.15)", borderRadius:"8px",
      overflow:"hidden",
    }}>
      <div style={{ padding:"0.625rem 1rem",
                    borderBottom:"1px solid rgba(255,133,0,0.1)",
                    background:"rgba(255,133,0,0.04)",
                    display:"flex", alignItems:"center", gap:"0.5rem" }}>
        <div style={{ width:6, height:6, borderRadius:"50%", background:"#FF8C00",
                      animation:"pulse 2s ease-in-out infinite" }}/>
        <span style={{ fontSize:"0.44rem", fontWeight:700,
                       color:"rgba(255,133,0,0.7)", fontFamily:MONO,
                       letterSpacing:"0.12em", textTransform:"uppercase" }}>
          Circuit Safety Agent · On-Chain
        </span>
      </div>
      {signals.map((sig, i) => (
        <div key={i} style={{ display:"grid",
                              gridTemplateColumns:"64px 90px 1fr",
                              padding:"0.45rem 1rem", gap:"0.5rem",
                              alignItems:"center",
                              borderBottom:i<signals.length-1?"1px solid rgba(255,255,255,0.04)":"none",
                              opacity:Math.max(0.4,1-i*0.12) }}>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ width:4, height:4, borderRadius:"50%",
                          background:sig.col, flexShrink:0 }}/>
            <span style={{ fontSize:"0.3rem", fontWeight:800, color:sig.col,
                           fontFamily:MONO, letterSpacing:"0.06em" }}>
              {sig.level}
            </span>
          </div>
          <span style={{ fontSize:"0.36rem", color:"rgba(255,255,255,0.35)",
                         fontFamily:MONO, textTransform:"uppercase",
                         letterSpacing:"0.06em" }}>{sig.type}</span>
          <span style={{ fontSize:"0.46rem", color:"rgba(255,255,255,0.55)" }}>
            {sig.msg}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TrainPage() {
  return (
    <div style={{ minHeight:"100vh", background:"#060810", color:"#f0f0f0" }}>

      {/* Header */}
      <header style={{ height:48, padding:"0 1.5rem",
                       display:"flex", alignItems:"center", justifyContent:"space-between",
                       borderBottom:"1px solid rgba(255,255,255,0.06)",
                       background:"rgba(6,8,16,0.98)" }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:"0.5rem" }}>
          <a href="/" style={{ fontSize:"0.9rem", fontWeight:900, color:"#C8A96E",
                               fontFamily:MONO, letterSpacing:"0.1em",
                               textDecoration:"none" }}>ABRAXAS</a>
          <span style={{ fontSize:"0.34rem", color:"rgba(255,255,255,0.18)",
                         fontFamily:MONO, letterSpacing:"0.25em",
                         textTransform:"uppercase" }}>TRAIN</span>
        </div>
        <a href="/" style={{ padding:"0.3rem 0.625rem", borderRadius:"4px",
                             border:"1px solid rgba(255,255,255,0.08)",
                             color:"rgba(255,255,255,0.35)", fontSize:"0.46rem",
                             textDecoration:"none", fontFamily:MONO }}>← App</a>
      </header>

      <div style={{ maxWidth:960, margin:"0 auto", padding:"2.5rem 1rem 5rem" }}>

        {/* Hero */}
        <div style={{ marginBottom:"3rem" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:6,
                        padding:"0.2rem 0.75rem", borderRadius:"3px",
                        border:"1px solid rgba(20,241,149,0.2)",
                        background:"rgba(20,241,149,0.05)", marginBottom:"1.25rem" }}>
            <div style={{ width:5, height:5, borderRadius:"50%", background:"#14F195",
                          animation:"pulse 2s ease-in-out infinite" }}/>
            <span style={{ fontSize:"0.44rem", fontWeight:700,
                           color:"rgba(20,241,149,0.7)", fontFamily:MONO,
                           letterSpacing:"0.2em", textTransform:"uppercase" }}>
              AI Guardian Protocol · Sui
            </span>
          </div>
          <h1 style={{ fontWeight:900,
                       fontSize:"clamp(1.8rem,4vw,3rem)",
                       color:"#f0f0f0", margin:"0 0 1rem",
                       letterSpacing:"-0.05em", lineHeight:1.0 }}>
            Autonomous Protection<br/>
            <span style={{ color:"#14F195" }}>for Real-World Assets</span>
          </h1>
          <p style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.38)",
                      lineHeight:1.8, maxWidth:560, margin:0 }}>
            Abraxas is an AI-powered guardian protocol for Real-World Assets on Sui.
            It turns passive tokenized assets into actively managed, hedged, and protected
            holdings using autonomous Sophia AI agents and the Circuit on-chain safety agent.
          </p>
        </div>

        {/* Live feeds */}
        <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr",
                      gap:"1rem", marginBottom:"2.5rem" }}>
          <AgentFeed/>
          <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
            <CircuitFeed/>
            {/* Stats */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                          gap:1, background:"rgba(255,255,255,0.06)",
                          borderRadius:"8px", overflow:"hidden" }}>
              {([
                ["Active Agents","3","#14F195"],
                ["Circuit Status","ARMED","#14F195"],
                ["Positions Guarded","3","#C8A96E"],
                ["Flags Resolved","0","rgba(255,255,255,0.5)"],
              ] as [string,string,string][]).map(([l,v,c])=>(
                <div key={l} style={{ padding:"0.875rem",
                                      background:"rgba(6,8,16,0.98)" }}>
                  <div style={{ fontSize:"0.88rem", fontWeight:900, color:c,
                                fontFamily:MONO, lineHeight:1, marginBottom:3 }}>{v}</div>
                  <div style={{ fontSize:"0.36rem", color:"rgba(255,255,255,0.25)",
                                fontFamily:MONO, textTransform:"uppercase",
                                letterSpacing:"0.1em" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sophia features */}
        <div style={{ marginBottom:"2.5rem" }}>
          <div style={{ fontSize:"0.48rem", fontWeight:700,
                        color:"rgba(255,255,255,0.2)", fontFamily:MONO,
                        textTransform:"uppercase", letterSpacing:"0.18em",
                        marginBottom:"1.25rem" }}>
            Sophia Agent Capabilities
          </div>
          <div style={{ display:"grid",
                        gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,220px),1fr))",
                        gap:"0.75rem" }}>
            {SOPHIA_FEATURES.map(f => (
              <div key={f.label} style={{ padding:"1.25rem",
                                          border:"1px solid rgba(20,241,149,0.12)",
                                          borderRadius:"8px",
                                          background:"rgba(20,241,149,0.03)" }}>
                <div style={{ fontSize:"1.1rem", color:"#14F195", opacity:0.7,
                              marginBottom:"0.5rem", lineHeight:1 }}>{f.icon}</div>
                <div style={{ fontWeight:800, fontSize:"0.68rem",
                              color:"#f0f0f0", marginBottom:"0.4rem" }}>{f.label}</div>
                <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.35)",
                              lineHeight:1.65 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Circuit explanation */}
        <div style={{ padding:"1.5rem", border:"1px solid rgba(255,133,0,0.15)",
                      borderRadius:"8px", background:"rgba(255,133,0,0.03)" }}>
          <div style={{ fontSize:"0.48rem", fontWeight:700,
                        color:"rgba(255,133,0,0.5)", fontFamily:MONO,
                        textTransform:"uppercase", letterSpacing:"0.18em",
                        marginBottom:"0.75rem" }}>Circuit On-Chain Safety Agent</div>
          <p style={{ fontSize:"0.62rem", color:"rgba(255,255,255,0.38)",
                      lineHeight:1.75, margin:"0 0 1rem" }}>
            Circuit monitors price velocity, liquidity depth, oracle consistency,
            and custody audit compliance in real time. When conditions breach
            configured thresholds, Circuit triggers small, automatic protective
            actions — partial de-risking, collateral alerts, or custody escalation —
            before positions become vulnerable to liquidation.
          </p>
          <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
            {["Flash crash detection","Liquidity drain alerts","Oracle anomaly flagging",
              "Custody audit enforcement","Automatic partial de-risking"].map(cap=>(
              <div key={cap} style={{ padding:"0.3rem 0.75rem", borderRadius:"4px",
                                      border:"1px solid rgba(255,133,0,0.2)",
                                      background:"rgba(255,133,0,0.06)",
                                      fontSize:"0.44rem", color:"rgba(255,133,0,0.65)",
                                      fontFamily:MONO }}>
                ⚡ {cap}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop:"1.5rem", fontSize:"0.46rem",
                      color:"rgba(255,255,255,0.18)", textAlign:"center",
                      fontFamily:MONO }}>
          Sophia Agents + Circuit are in active development.
          Connect your wallet and tokenize an asset to begin guardian monitoring.
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}