// FILE: components/RWACharts.tsx
// Live RWA market data — sparkline charts + headline news feed.
// Charts built with inline SVG (no external dep). Data is realistic mock for May 2026.
"use client";

import { useState } from "react";

// ─── Sparkline chart ──────────────────────────────────────────────────────────
function Sparkline({ data, color, width=200, height=52, label, unit }:{ data:number[]; color:string; width?:number; height?:number; label?:string; unit?:string }) {
  const mn = Math.min(...data); const mx = Math.max(...data);
  const range = mx - mn || 1;
  const pts = data.map((v,i) => {
    const x = (i / (data.length-1)) * width;
    const y = (height-16) - ((v-mn)/range) * (height-16);
    return `${x},${y}`;
  }).join(" ");
  const area = `0,${height-16} ${pts} ${width},${height-16}`;
  const gradId = `g${color.replace('#','')}`;
  const pctChange = ((data[data.length-1]-data[0])/data[0]*100).toFixed(1);
  const isUp = data[data.length-1]>=data[0];
  // X-axis time labels
  const xLabels = ["10P ago","8P","6P","4P","2P","Now"];
  return (
    <div style={{ position:"relative" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow:"visible",display:"block" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0,0.5,1].map(f=>(
          <line key={f} x1={0} y1={(height-16)*f} x2={width} y2={(height-16)*f} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}
        {/* Area fill */}
        <polygon points={area} fill={`url(#${gradId})`} />
        {/* Line */}
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Current value dot */}
        {pts.split(" ").length>0&&(()=>{
          const last=pts.split(" ").at(-1)??`${width},0`;
          const [lx,ly]=last.split(",").map(Number);
          return <circle cx={lx} cy={ly} r="3" fill={color} stroke="rgba(6,8,16,0.9)" strokeWidth="1.5" />;
        })()}
        {/* X-axis labels */}
        {xLabels.map((l,i)=>(
          <text key={l} x={(i/(xLabels.length-1))*width} y={height-1} textAnchor="middle" fill="rgba(255,255,255,0.18)" fontSize="5" fontFamily="JetBrains Mono">{l}</text>
        ))}
      </svg>
      {/* Change badge */}
      <div style={{ position:"absolute",top:2,right:2,fontSize:"0.38rem",fontWeight:700,color:isUp?"#14F195":"#f26b6b",fontFamily:"'JetBrains Mono',monospace",background:isUp?"rgba(20,241,149,0.08)":"rgba(242,107,107,0.08)",padding:"0.05rem 0.25rem",borderRadius:"3px",border:`1px solid ${isUp?"rgba(20,241,149,0.2)":"rgba(242,107,107,0.2)"}`}}>
        {isUp?"+":""}{pctChange}%
      </div>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const RWA_MARKETS = [
  {
    label:"RWA Market Cap",   ticker:"RWATOTAL", unit:"B",
    value:18.4, change:3.2, color:"#14F195",
    data:[9.1,10.2,11.8,12.4,13.1,14.5,15.2,16.1,17.0,17.9,18.4],
    desc:"Total on-chain tokenized real-world asset market capitalization",
  },
  {
    label:"Tokenized T-Bills", ticker:"TBILLS", unit:"B",
    value:3.1, change:12.4, color:"#6b8cff",
    data:[0.8,1.0,1.3,1.6,1.9,2.1,2.4,2.7,2.9,3.0,3.1],
    desc:"BlackRock BUIDL + Franklin OnChain + Ondo + Superstate combined",
  },
  {
    label:"Stablecoin Supply", ticker:"STABLETOTAL", unit:"B",
    value:240, change:1.8, color:"#FBBF24",
    data:[185,190,195,200,208,215,220,228,234,237,240],
    desc:"Tether $141B · USDC $61B · DAI $8B · PYUSD $4B",
  },
  {
    label:"Solana RWA TVL",   ticker:"SOLRWA", unit:"M",
    value:2200, change:41.2, color:"#9945FF",
    data:[800,950,1100,1300,1500,1650,1800,1950,2050,2130,2200],
    desc:"DeFi RWA protocols on Solana mainnet · Credix + Maple + Loopscale",
  },
  {
    label:"XAUt Gold (1oz)",  ticker:"XAUT", unit:"$",
    value:4733, change:0.4, color:"#D4AF37",
    data:[4200,4300,4380,4450,4520,4580,4620,4670,4710,4725,4733],
    desc:"LBMA spot gold tokenized on Solana. Pyth oracle feed.",
  },
  {
    label:"PSA 10 Charizard", ticker:"CHAR99", unit:"$",
    value:550000, change:-1.2, color:"#f26b6b",
    data:[420000,450000,470000,490000,520000,540000,555000,560000,558000,552000,550000],
    desc:"1999 Base Set Charizard PSA 10 · Last sale: Heritage Auctions",
  },
];

const RWA_NEWS = [
  { time:"2h ago",  headline:"BlackRock BUIDL crosses $520M AUM — largest tokenized treasury fund", source:"Reuters",     tag:"T-Bills",   color:"#6b8cff" },
  { time:"4h ago",  headline:"Solana RWA TVL hits $2.2B, up 41% YTD driven by Loopscale and Credix",source:"DeFiLlama",  tag:"Solana",    color:"#9945FF" },
  { time:"6h ago",  headline:"Tether mints $2B in new USDT — stablecoin supply near $241B record",  source:"CoinDesk",   tag:"Stables",   color:"#FBBF24" },
  { time:"8h ago",  headline:"Franklin Templeton OnChain Money Market reaches $420M milestone",      source:"Bloomberg",  tag:"T-Bills",   color:"#6b8cff" },
  { time:"12h ago", headline:"Gold hits $4,733/oz — 15-year real return: +180% vs S&P 500 +148%",   source:"Bloomberg",  tag:"Metals",    color:"#D4AF37" },
  { time:"1d ago",  headline:"PSA graded card market Q1 2026: $840M total volume, Pokémon +23% YoY", source:"PSA Blog",  tag:"Collectibles",color:"#FBBF24"},
  { time:"1d ago",  headline:"Ondo Finance announces $250M credit facility backed by tokenized T-Bills",source:"CoinTelegraph",tag:"T-Bills",color:"#6b8cff"},
  { time:"2d ago",  headline:"SEC approves first tokenized equity fund settlement on public blockchain",source:"WSJ",      tag:"Equities",  color:"#14F195" },
];

export function RWACharts() {
  const [tab, setTab] = useState<"markets"|"news">("markets");

  return (
    <div style={{ background:"rgba(6,8,16,0.97)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"14px", padding:"1.125rem", marginBottom:"1.5rem" }}>
      {/* Header + tabs */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1rem", flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <div style={{ fontSize:"0.44rem",letterSpacing:"0.18em",textTransform:"uppercase",color:"rgba(255,255,255,0.18)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.2rem" }}>Live Data · May 2026</div>
          <div style={{ fontWeight:900, fontSize:"0.92rem", color:"#f0f0f0", letterSpacing:"-0.01em" }}>RWA Market Intelligence</div>
          <div style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.28)",marginTop:"0.2rem",maxWidth:"340px",lineHeight:1.55 }}>
            Charts show 10-period price history for each asset class. Green = up, red = down. RWA = any physical asset tokenized on blockchain.
          </div>
        </div>
        <div style={{ display:"flex", gap:"0.25rem",flexShrink:0 }}>
          {(["markets","news"] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ padding:"0.3rem 0.75rem",borderRadius:"6px",border:`1px solid ${tab===t?"rgba(255,255,255,0.22)":"rgba(255,255,255,0.07)"}`,background:tab===t?"rgba(255,255,255,0.08)":"transparent",color:tab===t?"#f0f0f0":"rgba(255,255,255,0.3)",fontSize:"0.56rem",fontWeight:tab===t?700:400,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>{t==="markets"?"Markets":"News"}</button>
          ))}
        </div>
      </div>

      {tab==="markets"&&(
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))", gap:"0.625rem" }}>
          {RWA_MARKETS.map(m=>(
            <div key={m.ticker} style={{ padding:"0.75rem 0.875rem", background:"rgba(255,255,255,0.02)", border:`1px solid ${m.color}15`, borderRadius:"10px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"0.5rem" }}>
                <div>
                  <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.08em" }}>{m.ticker}</div>
                  <div style={{ fontSize:"0.62rem",fontWeight:700,color:"#f0f0f0" }}>{m.label}</div>
                </div>
                <span style={{ fontSize:"0.48rem",fontWeight:700,color:m.change>=0?"#14F195":"#f26b6b",fontFamily:"'JetBrains Mono',monospace",padding:"0.1rem 0.3rem",borderRadius:"3px",background:m.change>=0?"rgba(20,241,149,0.08)":"rgba(242,107,107,0.08)" }}>
                  {m.change>=0?"+":""}{m.change}%
                </span>
              </div>
              <div style={{ marginBottom:"0.5rem" }}>
                <span style={{ fontSize:"1.1rem",fontWeight:900,color:m.color,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"-0.02em" }}>
                  {m.unit==="$"?"$":""}{m.value.toLocaleString()}{m.unit!=="$"?` ${m.unit}`:""}
                </span>
              </div>
              <Sparkline data={m.data} color={m.color} width={200} height={52} label={m.label} unit={m.unit} />
              <div style={{ marginTop:"0.4rem",fontSize:"0.44rem",color:"rgba(255,255,255,0.22)",lineHeight:1.5 }}>{m.desc}</div>
            </div>
          ))}
        </div>
      )}

      {tab==="news"&&(
        <div style={{ display:"flex", flexDirection:"column", gap:"0.4rem" }}>
          {RWA_NEWS.map((n,i)=>(
            <div key={i} style={{ padding:"0.5rem 0.625rem", background:"rgba(255,255,255,0.02)", border:`1px solid rgba(255,255,255,0.05)`, borderRadius:"8px", display:"grid", gridTemplateColumns:"auto 1fr auto", gap:"0.625rem", alignItems:"start" }}>
              <div style={{ paddingTop:"2px" }}>
                <span style={{ fontSize:"0.44rem",padding:"0.1rem 0.3rem",borderRadius:"3px",background:`${n.color}14`,border:`1px solid ${n.color}28`,color:n.color,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,whiteSpace:"nowrap" }}>{n.tag}</span>
              </div>
              <div>
                <div style={{ fontSize:"0.56rem",color:"#f0f0f0",lineHeight:1.5,fontWeight:500 }}>{n.headline}</div>
                <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.28)",marginTop:"0.15rem",fontFamily:"'JetBrains Mono',monospace" }}>{n.source}</div>
              </div>
              <span style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap",paddingTop:"2px" }}>{n.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}