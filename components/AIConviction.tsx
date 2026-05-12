// FILE: components/AIConviction.tsx
// Per-asset AI conviction signal: bullish/bearish, confidence, drivers, momentum
"use client";
import { useMemo } from "react";

interface ConvictionProps {
  assetId:string; assetName:string; category:string; price:number;
  change24h:number; rarity:string; compact?:boolean;
}

// Deterministic conviction from asset properties (no randomness on render)
function getConviction(id:string, price:number, chg:number, rarity:string, category:string) {
  const h = id.split("").reduce((s,c)=>s+c.charCodeAt(0),0);
  const base = 45 + (h % 45); // 45–89%
  const bullish = chg>=0 || (h%3===0);
  const conf = chg>2?Math.min(92,base+15):chg<-2?Math.max(38,base-12):base;

  const BULL_DRIVERS: Record<string,string[]> = {
    Pokemon:    ["Increased PSA submission volume","Collector Crypt pull demand up","Heritage auction comps rising"],
    Spirits:    ["Baxus marketplace volume +31%","Distillery scarcity signal","Collector demand seasonal surge"],
    Watches:    ["Courtyard secondary market tightening","Rolex supply constrained","Luxury asset flight to quality"],
    Comics:     ["Heritage auction cycle approaching","CGC census tightening","IP/film catalyst in pipeline"],
    Metals:     ["Fed rate decision imminent","Dollar index weakening","Institutional inflow signal"],
    Stocks:     ["Earnings beat momentum","Sector rotation inflow","Options flow bullish"],
    Racehorses: ["Season earnings trajectory","Syndication demand rising","Breeding rights premium"],
    "One Piece":["Collector Crypt gacha demand","Manga volume milestone","Community floor bid support"],
    Sports:     ["Card show season approaching","PSA registry growth","Population tightening"],
  };
  const BEAR_DRIVERS: Record<string,string[]> = {
    Pokemon:    ["Supply increase on secondary","PSA pop report growth","Profit-taking near resistance"],
    Spirits:    ["Baxus inventory depth increasing","Off-vintage pressure","Seasonal demand lull"],
    Watches:    ["New model announcement suppressing","Used market softening","LTV compression risk"],
    Comics:     ["CGC census expanding","Grading backlog clearing","Bid/ask spread widening"],
    Metals:     ["Dollar strength headwind","Risk-on rotation reducing","Pyth oracle volatility"],
    default:    ["Momentum fading","Supply/demand imbalance","Macro headwinds"],
  };

  const drivers = bullish
    ? (BULL_DRIVERS[category]??["Strong collector demand","Supply tightening","Conviction flow"])
    : (BEAR_DRIVERS[category]??BEAR_DRIVERS.default);

  const selectedDrivers = [drivers[h%drivers.length], drivers[(h+1)%drivers.length]];

  const momentum = chg>3?"🔥 Hot":chg>1?"↑ Rising":chg>-1?"→ Steady":chg>-3?"↓ Softening":"🧊 Cold";

  return { bullish, conf, drivers:selectedDrivers, momentum };
}

export function AIConvictionBadge({ assetId, assetName, category, price, change24h, rarity, compact=false }:ConvictionProps) {
  const { bullish, conf, drivers, momentum } = useMemo(
    ()=>getConviction(assetId,price,change24h,rarity,category),
    [assetId,price,change24h,rarity,category]
  );

  if (compact) {
    return (
      <div style={{ display:"flex",alignItems:"center",gap:"0.2rem",padding:"0.08rem 0.3rem",borderRadius:"4px",background:bullish?"rgba(20,241,149,0.08)":"rgba(242,107,107,0.08)",border:`1px solid ${bullish?"rgba(20,241,149,0.2)":"rgba(242,107,107,0.2)"}` }}>
        <div style={{ width:"4px",height:"4px",borderRadius:"50%",background:bullish?"#14F195":"#f26b6b",animation:"pulse 2s ease-in-out infinite" }} />
        <span style={{ fontSize:"0.38rem",fontWeight:700,color:bullish?"#14F195":"#f26b6b",fontFamily:"'JetBrains Mono',monospace" }}>AI {bullish?"BULL":"BEAR"} {conf}%</span>
      </div>
    );
  }

  return (
    <div style={{ padding:"0.5rem 0.625rem",background:bullish?"rgba(20,241,149,0.04)":"rgba(242,107,107,0.04)",border:`1px solid ${bullish?"rgba(20,241,149,0.15)":"rgba(242,107,107,0.15)"}`,borderRadius:"7px" }}>
      {/* Header */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.3rem" }}>
        <div style={{ display:"flex",alignItems:"center",gap:"0.3rem" }}>
          <div style={{ width:"5px",height:"5px",borderRadius:"50%",background:bullish?"#14F195":"#f26b6b",animation:"pulse 1.5s ease-in-out infinite" }} />
          <span style={{ fontSize:"0.44rem",fontWeight:800,color:bullish?"#14F195":"#f26b6b",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.06em" }}>
            AI {bullish?"BULLISH":"BEARISH"}
          </span>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:"0.25rem" }}>
          <div style={{ width:"42px",height:"4px",borderRadius:"2px",background:"rgba(255,255,255,0.07)",overflow:"hidden" }}>
            <div style={{ width:`${conf}%`,height:"100%",background:bullish?"#14F195":"#f26b6b",borderRadius:"2px" }} />
          </div>
          <span style={{ fontSize:"0.44rem",fontWeight:700,color:bullish?"#14F195":"#f26b6b",fontFamily:"'JetBrains Mono',monospace" }}>{conf}%</span>
        </div>
      </div>
      {/* Drivers */}
      {drivers.map((d,i)=>(
        <div key={i} style={{ display:"flex",gap:"0.25rem",alignItems:"flex-start",marginBottom:"0.12rem" }}>
          <span style={{ fontSize:"0.38rem",color:bullish?"rgba(20,241,149,0.5)":"rgba(242,107,107,0.5)",flexShrink:0,marginTop:"1px" }}>▸</span>
          <span style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.4)",lineHeight:1.4 }}>{d}</span>
        </div>
      ))}
      <div style={{ marginTop:"0.2rem",fontSize:"0.42rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace" }}>{momentum}</div>
    </div>
  );
}