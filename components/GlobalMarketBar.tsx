// FILE: components/GlobalMarketBar.tsx  
// Bloomberg-style global market bar: BTC/ETH/SOL + RWA sentiment + AI confidence
// Sits below Nav, above everything. Information density first.
"use client";
import { useState, useEffect } from "react";

interface Ticker { sym:string; price:string; chg:string; up:boolean; color:string; }

const INIT_TICKERS: Ticker[] = [
  { sym:"BTC",  price:"$80,635", chg:"-2.1%",  up:false, color:"#F7931A" },
  { sym:"ETH",  price:"$2,322",  chg:"-3.4%",  up:false, color:"#627EEA" },
  { sym:"SOL",  price:"$95.15",  chg:"-4.2%",  up:false, color:"#9945FF" },
  { sym:"SUI",  price:"$1.27",   chg:"-1.8%",  up:false, color:"#4DA2FF" },
  { sym:"XAUt", price:"$3,232",  chg:"+0.3%",  up:true,  color:"#D4AF37" },
  { sym:"NVDA", price:"$105.82", chg:"+1.4%",  up:true,  color:"#76B900" },
  { sym:"ABRA", price:"$0.021",  chg:"+6.2%",  up:true,  color:"#C8A96E" },
];

const AI_SIGNALS = [
  "AI: Spirits volume anomaly detected · Bullish",
  "AI: Charizard 99 PSA10 — unusual buy pressure · 78% confidence",
  "AI: RWA market cap approaching breakout · $18.4B",
  "AI: Whale movement in Rolex Sub · 3 transfers in 2h",
  "AI: Pappy Van Winkle demand surge · Kentucky Derby weekend",
];

export function GlobalMarketBar() {
  const [tickers, setTickers] = useState(INIT_TICKERS);
  const [signal,  setSignal]  = useState(0);
  const [fear,    setFear]    = useState(62); // 0–100 greed index

  // Micro price drift
  useEffect(()=>{
    const iv = setInterval(()=>{
      setTickers(t=>t.map(tk=>({
        ...tk,
        price: tk.sym==="BTC"  ? `$${(80635+Math.round((Math.random()-0.5)*400)).toLocaleString()}` :
               tk.sym==="SOL"  ? `$${(95.15+(Math.random()-0.5)*1.5).toFixed(2)}` :
               tk.sym==="ETH"  ? `$${(2322+(Math.random()-0.5)*20).toFixed(0)}` :
               tk.sym==="ABRA" ? `$${(0.021+(Math.random()-0.5)*0.001).toFixed(4)}` : tk.price,
      })));
      setFear(f=>Math.max(0,Math.min(100,f+Math.round((Math.random()-0.5)*3))));
    }, 2800);
    const iv2 = setInterval(()=>setSignal(s=>(s+1)%AI_SIGNALS.length), 4500);
    return ()=>{ clearInterval(iv); clearInterval(iv2); };
  },[]);

  const fearLabel = fear>=70?"Greed":fear>=50?"Neutral":fear>=30?"Fear":"Extreme Fear";
  const fearColor = fear>=70?"#14F195":fear>=50?"#FBBF24":fear>=30?"#fb923c":"#f26b6b";

  return (
    <div style={{
      position:"sticky", top:"52px", zIndex:45,
      background:"rgba(2,3,10,0.98)",
      borderBottom:"1px solid rgba(255,255,255,0.06)",
      backdropFilter:"blur(20px)",
      overflowX:"auto",
    }}>
      <div style={{ display:"flex", alignItems:"center", height:"32px", padding:"0 1rem", gap:"0", minWidth:"max-content" }}>

        {/* Tickers */}
        {tickers.map((tk,i)=>(
          <div key={tk.sym} style={{ display:"flex",alignItems:"center",gap:"0.3rem",padding:"0 0.625rem",borderRight:"1px solid rgba(255,255,255,0.04)",height:"100%",flexShrink:0 }}>
            <span style={{ fontSize:"0.48rem",fontWeight:700,color:tk.color,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em" }}>{tk.sym}</span>
            <span style={{ fontSize:"0.5rem",color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace",fontVariantNumeric:"tabular-nums" }}>{tk.price}</span>
            <span style={{ fontSize:"0.46rem",fontWeight:700,color:tk.up?"#14F195":"#f26b6b",fontFamily:"'JetBrains Mono',monospace" }}>{tk.chg}</span>
          </div>
        ))}

        {/* Fear/Greed */}
        <div style={{ display:"flex",alignItems:"center",gap:"0.3rem",padding:"0 0.625rem",borderRight:"1px solid rgba(255,255,255,0.04)",flexShrink:0,height:"100%" }}>
          <span style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.08em",textTransform:"uppercase" }}>Sentiment</span>
          <span style={{ fontSize:"0.52rem",fontWeight:800,color:fearColor,fontFamily:"'JetBrains Mono',monospace" }}>{fear}</span>
          <span style={{ fontSize:"0.44rem",color:fearColor,fontFamily:"'JetBrains Mono',monospace" }}>{fearLabel}</span>
        </div>

        {/* AI Signal rolling */}
        <div style={{ display:"flex",alignItems:"center",gap:"0.35rem",padding:"0 0.875rem",flexShrink:0,height:"100%",flex:1,minWidth:"200px" }}>
          <div style={{ width:"5px",height:"5px",borderRadius:"50%",background:"#a855f7",animation:"pulse 1.5s ease-in-out infinite",flexShrink:0 }} />
          <span key={signal} style={{ fontSize:"0.46rem",color:"rgba(168,85,247,0.8)",fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap",animation:"fadeIn 0.4s ease-out" }}>
            {AI_SIGNALS[signal]}
          </span>
        </div>

        {/* RWA Mkt Cap */}
        <div style={{ display:"flex",alignItems:"center",gap:"0.3rem",padding:"0 0.625rem",borderLeft:"1px solid rgba(255,255,255,0.04)",flexShrink:0,height:"100%" }}>
          <span style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace" }}>RWA MktCap</span>
          <span style={{ fontSize:"0.5rem",fontWeight:700,color:"#14F195",fontFamily:"'JetBrains Mono',monospace" }}>$18.4B</span>
          <span style={{ fontSize:"0.44rem",color:"#14F195",fontFamily:"'JetBrains Mono',monospace" }}>+3.2%</span>
        </div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}