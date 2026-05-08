// FILE: components/TerminalArena.tsx
// Sovereign Terminal: Sold Tape → Tokenize CTA → Stocks → Metals → Sovereign Asset Combat
// Arena: full 5-phase economic warfare engine with archetypes, liquidity system, macro events
// Card grid: 2-per-row default, stat display replaces broken TT side boxes
// All images from /public/assets/rwa/ — CDN URLs removed
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ArenaAsset {
  id: string; name: string; category: string; ticker: string;
  grade: string; gradingCo: string; vaultLocation: string;
  priceUsd: number; last_sold_price: number; last_sold_source?: string;
  change24h: number; imagePath?: string | null; rarity: string;
  atk: number; def: number; speed: number;
  circuitScore: number; defenseLevel: string;
  protected: boolean; staked: boolean; apy?: number;
  is_duel_eligible?: boolean;
  attributes?: { power_level: number };
  can_borrow?: boolean; ltv?: number;
  archetype?: string; archetype_color?: string;
  // Triple Triad sides (enriched at match time)
  ttTop?: number; ttRight?: number; ttBottom?: number; ttLeft?: number;
}

interface SoldTick {
  id: string; name: string; price: number; category: string;
  source: string; ts: number; ticker: string;
}

// ─── Macro events ────────────────────────────────────────────────────────────
interface MacroEvent {
  id: string; name: string; desc: string;
  effects: Record<string, { atk?: number; def?: number; liq?: number }>;
  color: string;
}
const MACRO_EVENTS: MacroEvent[] = [
  {
    id:"fed_hike",   name:"Fed Rate Hike",
    desc:"Legacy assets strengthen. Speculative assets lose liquidity.",
    color:"#FBBF24",
    effects:{ Tank:{def:+12}, Yield:{def:+8,liq:+5}, Aggro:{liq:-8}, Volatility:{atk:+5,liq:-12} }
  },
  {
    id:"risk_off",   name:"Crypto Risk-Off",
    desc:"Control assets stabilize. Momentum assets crater.",
    color:"#f26b6b",
    effects:{ Tank:{def:+15}, Control:{def:+10}, Aggro:{atk:-10,liq:-8}, Volatility:{atk:-15,liq:-15} }
  },
  {
    id:"gold_surge", name:"Commodity Surge",
    desc:"Metals and real assets gain yield. Equities pressured.",
    color:"#D4AF37",
    effects:{ Yield:{def:+15,liq:+10}, Tank:{def:+8}, Control:{atk:-5} }
  },
  {
    id:"sol_bull",   name:"Solana Liquidity Inflow",
    desc:"On-chain assets surge. Settlement velocity increases.",
    color:"#9945FF",
    effects:{ Aggro:{atk:+12,liq:+8}, Volatility:{atk:+15,liq:+10}, Yield:{liq:+5} }
  },
  {
    id:"treasury",   name:"Sovereign Treasury Shock",
    desc:"Institutional reserve assets protected. Speculative burn.",
    color:"#60A5FA",
    effects:{ Tank:{def:+20}, Yield:{def:+12}, Aggro:{atk:-8,liq:-10}, Volatility:{liq:-18} }
  },
];

// ─── Sophia Agents ────────────────────────────────────────────────────────────
const AGENTS = [
  { id:"HED", name:"Sophia-Hed", role:"Hedge Strategist",  style:"Defensive",  buff:"Tank/Yield +20% DEF",   color:"#14F195", tactic:"hedge"    },
  { id:"REB", name:"Sophia-Reb", role:"Rebalance Engine",  style:"Adaptive",   buff:"All +10% on rebalance", color:"#6b8cff", tactic:"rebalance" },
  { id:"YLD", name:"Sophia-Yld", role:"Yield Optimizer",   style:"Economic",   buff:"Yield units +2x LIQ",   color:"#C8A96E", tactic:"yield"    },
  { id:"CGD", name:"Sophia-Cgd", role:"Circuit Guardian",  style:"Control",    buff:"Shield absorbs 40% dmg",color:"#a855f7", tactic:"guard"    },
] as const;

// ─── Archetype config ─────────────────────────────────────────────────────────
const ARCH_CFG: Record<string, { label:string; color:string; desc:string; liqCost:number }> = {
  Tank:       { label:"Tank",       color:"#14F195", desc:"High DEF · Low volatility",         liqCost:2 },
  Aggro:      { label:"Aggro",      color:"#FF6B35", desc:"High ATK · High risk",               liqCost:3 },
  Control:    { label:"Control",    color:"#a855f7", desc:"Macro manipulation · Debuffs",        liqCost:2 },
  Yield:      { label:"Yield",      color:"#C8A96E", desc:"Passive economy · LIQ generation",   liqCost:1 },
  Volatility: { label:"Volatility", color:"#f26b6b", desc:"Huge swings · High reward",           liqCost:4 },
};

// ─── Category colors ──────────────────────────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
  Pokemon:"#FBBF24", "One Piece":"#f26b6b", Comics:"#a855f7",
  Metals:"#D4AF37", Stocks:"#14F195", Timepieces:"#C8A96E",
  Luxury:"#60A5FA", Sports:"#fb923c",
};

// ─── TT / board helpers ───────────────────────────────────────────────────────
function statToTT(v: number): number { return Math.max(2, Math.min(10, Math.round(v / 10))); }
function ttLabel(v: number): string  { return v >= 10 ? "A" : String(v); }
function enrichTT(a: ArenaAsset): ArenaAsset {
  return { ...a, ttTop:statToTT(a.def), ttRight:statToTT(a.atk), ttBottom:statToTT(Math.round((a.atk+a.def)/2)), ttLeft:statToTT(a.speed) };
}

const ADJ: Record<number, Array<[number,"ttTop"|"ttRight"|"ttBottom"|"ttLeft","ttTop"|"ttRight"|"ttBottom"|"ttLeft"]>> = {
  0:[[1,"ttRight","ttLeft"],[3,"ttBottom","ttTop"]],
  1:[[0,"ttLeft","ttRight"],[2,"ttRight","ttLeft"],[4,"ttBottom","ttTop"]],
  2:[[1,"ttLeft","ttRight"],[5,"ttBottom","ttTop"]],
  3:[[0,"ttTop","ttBottom"],[4,"ttRight","ttLeft"],[6,"ttBottom","ttTop"]],
  4:[[1,"ttTop","ttBottom"],[3,"ttLeft","ttRight"],[5,"ttRight","ttLeft"],[7,"ttBottom","ttTop"]],
  5:[[2,"ttTop","ttBottom"],[4,"ttLeft","ttRight"],[8,"ttBottom","ttTop"]],
  6:[[3,"ttTop","ttBottom"],[7,"ttRight","ttLeft"]],
  7:[[4,"ttTop","ttBottom"],[6,"ttLeft","ttRight"],[8,"ttRight","ttLeft"]],
  8:[[5,"ttTop","ttBottom"],[7,"ttLeft","ttRight"]],
};

type Owner = "player"|"agent"|null;
interface Cell { asset:ArenaAsset|null; owner:Owner }

function applyFlips(board:Cell[], idx:number, owner:Owner): Cell[] {
  const b = board.map(c=>({...c}));
  const placed = b[idx]; if (!placed.asset||!owner) return b;
  for (const [ni,my,their] of ADJ[idx]) {
    const nb=b[ni]; if (!nb.asset||nb.owner===owner) continue;
    if ((placed.asset[my]??1)>(nb.asset[their]??1)) b[ni]={...nb,owner};
  }
  return b;
}
function scoreBoard(board:Cell[], owner:Owner) { return board.filter(c=>c.owner===owner).length; }

// ─── Match state ──────────────────────────────────────────────────────────────
interface MatchState {
  phase: "treasury"|"deploy"|"macro"|"agents"|"settle"|"done";
  board: Cell[]; playerHand: ArenaAsset[]; agentHand: ArenaAsset[];
  turn: "player"|"agent";
  liquidity: number; maxLiquidity: number;
  macroEvent: MacroEvent|null;
  activeAgent: typeof AGENTS[number];
  wager: number; wagerToken: "SOL"|"USDC"|"ABX";
  pinkSlips: boolean;
  log: string[]; winner: "player"|"agent"|"draw"|null;
  abraEarned: number; prestige: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtUsd(v: number): string {
  if (v>=1_000_000) return `$${(v/1_000_000).toFixed(2)}M`;
  if (v>=1_000)     return `$${(v/1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}
function timeAgo(ts:number): string {
  const s=Math.floor((Date.now()-ts)/1000);
  if (s<60) return `${s}s ago`; if (s<3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}
function buildSoldTape(assets:ArenaAsset[]): SoldTick[] {
  return assets.filter(a=>a.last_sold_price>0)
    .map(a=>({ id:a.id, name:a.name, price:a.last_sold_price, category:a.category,
      source:a.last_sold_source??"Oracle",
      ts:Date.now()-Math.floor(Math.abs(Math.sin(a.id.length*9301))*7_200_000), ticker:a.ticker }))
    .sort((a,b)=>b.price-a.price).slice(0,20);
}

// ─── Sold tape ────────────────────────────────────────────────────────────────
function SoldTape({ ticks }:{ ticks:SoldTick[] }) {
  if (!ticks.length) return null;
  return (
    <div style={{ position:"relative",height:"34px",background:"rgba(2,3,10,0.97)",borderBottom:"1px solid rgba(255,255,255,0.05)",overflow:"hidden",display:"flex",alignItems:"center" }}>
      <div style={{ position:"absolute",left:0,top:0,bottom:0,width:"72px",background:"linear-gradient(90deg,rgba(2,3,10,1) 60%,transparent)",zIndex:2,display:"flex",alignItems:"center",paddingLeft:"0.75rem" }}>
        <span style={{ fontSize:"0.48rem",fontWeight:900,color:"#14F195",letterSpacing:"0.16em",fontFamily:"'JetBrains Mono',monospace" }}>SOLD</span>
      </div>
      <div style={{ display:"flex",gap:0,paddingLeft:"80px",animation:"ticker 55s linear infinite",whiteSpace:"nowrap" }}>
        {[...ticks,...ticks].map((t,i)=>(
          <span key={i} style={{ display:"inline-flex",alignItems:"center",gap:"0.35rem",padding:"0 1.25rem",borderRight:"1px solid rgba(255,255,255,0.05)",fontSize:"0.56rem",fontFamily:"'JetBrains Mono',monospace",color:"rgba(255,255,255,0.65)" }}>
            <span style={{ color:CAT_COLOR[t.category]??"#fff",fontWeight:700 }}>{t.ticker}</span>
            <span style={{ color:"#f0f0f0",fontVariantNumeric:"tabular-nums",fontWeight:700 }}>{fmtUsd(t.price)}</span>
            <span style={{ color:"rgba(255,255,255,0.28)",fontSize:"0.48rem" }}>{t.source} · {timeAgo(t.ts)}</span>
          </span>
        ))}
      </div>
      <div style={{ position:"absolute",right:0,top:0,bottom:0,width:"50px",background:"linear-gradient(270deg,rgba(2,3,10,1) 40%,transparent)",zIndex:2 }} />
    </div>
  );
}

// ─── Asset image — full color, no grayscale ───────────────────────────────────
function AssetImage({ asset, height=140 }:{ asset:ArenaAsset; height?:number }) {
  const [err,setErr]=useState(false);
  const catColor=CAT_COLOR[asset.category]??"#6b8cff";
  if (!asset.imagePath||err) {
    return (
      <div style={{ height,background:`linear-gradient(135deg,${catColor}12,rgba(6,8,16,0.98))`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"0.3rem",padding:"0.5rem" }}>
        <span style={{ fontSize:"0.5rem",fontWeight:700,color:catColor,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",textAlign:"center" }}>{asset.category}</span>
        <span style={{ fontSize:"0.68rem",fontWeight:800,color:"#f0f0f0",textAlign:"center",lineHeight:1.25,padding:"0 0.25rem" }}>{asset.name}</span>
        <span style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.38)",fontFamily:"'JetBrains Mono',monospace" }}>{asset.grade}</span>
      </div>
    );
  }
  return (
    <div style={{ position:"relative",height,background:"rgba(6,8,16,0.98)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset.imagePath} alt={asset.name} onError={()=>setErr(true)}
        style={{ width:"100%",height:"100%",objectFit:"contain",display:"block" }} loading="lazy" />
      <div style={{ position:"absolute",bottom:0,left:0,right:0,height:"40%",background:"linear-gradient(to top,rgba(6,8,16,0.9),transparent)",pointerEvents:"none" }} />
    </div>
  );
}

// ─── Card archetype badge ─────────────────────────────────────────────────────
function ArchBadge({ arch }:{ arch?:string }) {
  if (!arch) return null;
  const cfg = ARCH_CFG[arch];
  if (!cfg) return null;
  return (
    <span style={{ fontSize:"0.42rem",fontWeight:700,padding:"0.08rem 0.3rem",borderRadius:"3px",background:`${cfg.color}18`,border:`1px solid ${cfg.color}44`,color:cfg.color,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.05em",flexShrink:0 }}>
      {cfg.label}
    </span>
  );
}

// ─── Arena card ───────────────────────────────────────────────────────────────
function ArenaCard({ asset, selected, owner, onSelect, compact }:{
  asset:ArenaAsset; selected?:boolean; owner?:Owner; onSelect?:(a:ArenaAsset)=>void; compact?:boolean;
}) {
  const [imgH] = useState(compact?90:150);
  const catColor = CAT_COLOR[asset.category]??"#6b8cff";
  const archColor = asset.archetype_color ?? catColor;
  const borderColor = owner==="player"?"#14F195":owner==="agent"?"#f26b6b":selected?"#D4AF37":`${catColor}30`;

  return (
    <div onClick={()=>onSelect?.(asset)} style={{
      position:"relative",borderRadius:"12px",overflow:"hidden",
      background:"rgba(6,8,16,0.97)",border:`1px solid ${borderColor}`,
      boxShadow:selected?`0 0 18px ${catColor}22`:owner?`0 0 10px ${borderColor}44`:"none",
      cursor:onSelect?"pointer":"default",transition:"border-color 0.2s,box-shadow 0.2s",
    }}>
      {asset.protected&&(
        <div style={{ position:"absolute",top:"0.3rem",right:"0.3rem",zIndex:4,display:"flex",alignItems:"center",gap:"0.18rem",padding:"0.07rem 0.28rem",borderRadius:"3px",background:"rgba(212,175,55,0.15)",border:"1px solid rgba(212,175,55,0.4)" }}>
          <span style={{ width:"3px",height:"3px",borderRadius:"50%",background:"#D4AF37",animation:"pulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize:"0.38rem",fontWeight:700,color:"#D4AF37",letterSpacing:"0.08em",fontFamily:"'JetBrains Mono',monospace" }}>AUTH</span>
        </div>
      )}
      {owner&&<div style={{ position:"absolute",top:"0.3rem",left:"0.3rem",zIndex:4,width:"7px",height:"7px",borderRadius:"50%",background:owner==="player"?"#14F195":"#f26b6b",boxShadow:`0 0 5px ${owner==="player"?"#14F195":"#f26b6b"}` }} />}

      <AssetImage asset={asset} height={imgH} />

      <div style={{ padding:"0.4rem 0.45rem" }}>
        <div style={{ fontWeight:800,fontSize:"0.7rem",color:"#f0f0f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:"2px" }}>{asset.name}</div>
        <div style={{ display:"flex",alignItems:"center",gap:"0.3rem",marginBottom:"0.28rem" }}>
          <span style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>{asset.grade}</span>
          <ArchBadge arch={asset.archetype} />
        </div>

        {!compact&&(
          <>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"0.28rem" }}>
              <span style={{ fontWeight:800,fontSize:"0.8rem",fontVariantNumeric:"tabular-nums",fontFamily:"'JetBrains Mono',monospace" }}>{fmtUsd(asset.priceUsd)}</span>
              <span style={{ fontSize:"0.52rem",fontWeight:700,color:asset.change24h>=0?"#14F195":"#f26b6b",fontVariantNumeric:"tabular-nums" }}>
                {asset.change24h>=0?"+":""}{asset.change24h?.toFixed(2)}%
              </span>
            </div>

            {/* Stat bars — replaces broken TT side boxes */}
            <div style={{ marginBottom:"0.28rem" }}>
              {([["ATK",asset.atk,"#FF6B35"],["DEF",asset.def,"#14F195"],["SPD",asset.speed,"#6b8cff"]] as [string,number,string][]).map(([l,v,col])=>(
                <div key={l} style={{ display:"flex",alignItems:"center",gap:"0.3rem",marginBottom:"0.15rem" }}>
                  <span style={{ fontSize:"0.42rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",width:"24px" }}>{l}</span>
                  <div style={{ flex:1,background:"rgba(255,255,255,0.06)",borderRadius:"1px",height:"3px" }}>
                    <div style={{ width:`${v}%`,height:"100%",background:col,borderRadius:"1px" }} />
                  </div>
                  <span style={{ fontSize:"0.42rem",color:col,fontVariantNumeric:"tabular-nums",fontFamily:"'JetBrains Mono',monospace",width:"20px",textAlign:"right" }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.28rem" }}>
              <span style={{ fontSize:"0.44rem",color:"#D4AF37",fontFamily:"'JetBrains Mono',monospace",fontVariantNumeric:"tabular-nums",fontWeight:700 }}>{fmtUsd(asset.last_sold_price)}</span>
              {asset.attributes?.power_level&&<span style={{ fontSize:"0.42rem",color:archColor,fontFamily:"'JetBrains Mono',monospace" }}>PWR {asset.attributes.power_level}</span>}
            </div>

            <a href="https://gacha.collectorcrypt.com/#pokemon" target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{ display:"block",padding:"0.28rem",borderRadius:"5px",fontSize:"0.5rem",fontWeight:700,background:"rgba(200,169,110,0.1)",border:"1px solid rgba(200,169,110,0.22)",color:"#C8A96E",textAlign:"center",textDecoration:"none",fontFamily:"'JetBrains Mono',monospace" }}>
              Acquire
            </a>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Tokenize CTA ─────────────────────────────────────────────────────────────
function TokenizeCTA() {
  return (
    <div style={{ marginBottom:"1.25rem",padding:"0.875rem 1rem",background:"rgba(107,140,255,0.05)",border:"1px solid rgba(107,140,255,0.14)",borderRadius:"12px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.625rem" }}>
      <div>
        <div style={{ fontWeight:800,fontSize:"0.82rem",color:"#f0f0f0",marginBottom:"3px" }}>Tokenize Your Assets</div>
        <div style={{ fontSize:"0.54rem",color:"rgba(255,255,255,0.38)",fontFamily:"'JetBrains Mono',monospace" }}>
          Luxury watches · Real estate · Stocks · Memorabilia · Precious metals
        </div>
      </div>
      <a href="/tokenize" style={{ padding:"0.4rem 0.875rem",borderRadius:"7px",background:"rgba(107,140,255,0.14)",border:"1px solid rgba(107,140,255,0.3)",color:"#6b8cff",fontSize:"0.65rem",fontWeight:700,textDecoration:"none",fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap" }}>
        Start Tokenizing
      </a>
    </div>
  );
}

// ─── Stock panel ──────────────────────────────────────────────────────────────
function StockPanel({ assets }:{ assets:ArenaAsset[] }) {
  const stocks = assets.filter(a=>a.category==="Stocks");
  if (!stocks.length) return null;
  return (
    <div style={{ marginBottom:"1.25rem",padding:"0.75rem 1rem",background:"rgba(20,241,149,0.04)",border:"1px solid rgba(20,241,149,0.1)",borderRadius:"12px" }}>
      <div style={{ fontSize:"0.5rem",fontWeight:700,color:"#14F195",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.5rem" }}>
        Tokenized Equity · NASDAQ On-Chain
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"0.4rem" }}>
        {stocks.map(s=>(
          <div key={s.id} style={{ padding:"0.5rem 0.625rem",background:"rgba(6,8,16,0.97)",border:"1px solid rgba(20,241,149,0.1)",borderRadius:"7px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
              <div>
                <div style={{ fontWeight:800,fontSize:"0.72rem",color:"#14F195",fontFamily:"'JetBrains Mono',monospace" }}>{s.ticker}</div>
                <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.3)" }}>{s.name.split("(")[0].trim()}</div>
              </div>
              <ArchBadge arch={s.archetype} />
            </div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",marginTop:"0.25rem" }}>
              <span style={{ fontWeight:800,fontSize:"0.82rem",fontVariantNumeric:"tabular-nums",fontFamily:"'JetBrains Mono',monospace" }}>${s.priceUsd.toFixed(2)}</span>
              <span style={{ fontSize:"0.54rem",fontWeight:700,color:s.change24h>=0?"#14F195":"#f26b6b",fontVariantNumeric:"tabular-nums" }}>
                {s.change24h>=0?"+":""}{s.change24h.toFixed(2)}%
              </span>
            </div>
            {s.can_borrow&&s.ltv&&<div style={{ fontSize:"0.42rem",color:"rgba(20,241,149,0.5)",fontFamily:"'JetBrains Mono',monospace",marginTop:"3px" }}>Borrow {Math.round(s.ltv*100)}% LTV</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Metals strip ─────────────────────────────────────────────────────────────
function MetalsStrip({ assets }:{ assets:ArenaAsset[] }) {
  const metals = assets.filter(a=>a.category==="Metals");
  if (!metals.length) return null;
  return (
    <div style={{ marginBottom:"1.25rem",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"0.5rem" }}>
      {metals.map(m=>(
        <div key={m.id} style={{ padding:"0.625rem 0.75rem",background:"rgba(212,175,55,0.05)",border:"1px solid rgba(212,175,55,0.14)",borderRadius:"10px",display:"flex",alignItems:"center",gap:"0.75rem" }}>
          <div style={{ width:"44px",height:"44px",flexShrink:0,borderRadius:"6px",overflow:"hidden",background:"rgba(6,8,16,0.95)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            {m.imagePath&&<img src={m.imagePath} alt={m.name} style={{ width:"100%",height:"100%",objectFit:"contain" }} onError={e=>{(e.target as HTMLImageElement).style.display="none"}} loading="lazy" />}
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontWeight:800,fontSize:"0.75rem",color:"#D4AF37",fontFamily:"'JetBrains Mono',monospace" }}>{m.ticker}</div>
            <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.32)",marginBottom:"0.18rem" }}>{m.name}</div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline" }}>
              <span style={{ fontWeight:800,fontSize:"0.82rem",fontVariantNumeric:"tabular-nums",fontFamily:"'JetBrains Mono',monospace" }}>
                ${m.priceUsd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
              </span>
              <span style={{ fontSize:"0.52rem",fontWeight:700,color:m.change24h>=0?"#14F195":"#f26b6b",fontVariantNumeric:"tabular-nums" }}>
                {m.change24h>=0?"+":""}{m.change24h.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Board cell ───────────────────────────────────────────────────────────────
function BoardCell({ cell, idx, canPlace, onPlace }:{ cell:Cell; idx:number; canPlace:boolean; onPlace:(i:number)=>void }) {
  const color = cell.owner==="player"?"#14F195":cell.owner==="agent"?"#f26b6b":"transparent";
  return (
    <div onClick={()=>canPlace&&onPlace(idx)} style={{
      height:"105px",borderRadius:"7px",overflow:"hidden",
      background:cell.asset?"rgba(6,8,16,0.97)":"rgba(2,3,10,0.7)",
      border:`2px solid ${cell.asset?color:"rgba(255,255,255,0.06)"}`,
      cursor:canPlace?"pointer":"default",position:"relative",transition:"border-color 0.2s",
    }}>
      {cell.asset?(
        <>
          <AssetImage asset={cell.asset} height={55} />
          <div style={{ padding:"0.18rem 0.28rem" }}>
            <div style={{ fontSize:"0.42rem",fontWeight:700,color:"#f0f0f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{cell.asset.name}</div>
            <div style={{ display:"flex",gap:"0.3rem",marginTop:"2px" }}>
              {([["T",cell.asset.ttTop,"#14F195"],["R",cell.asset.ttRight,"#FF6B35"],["B",cell.asset.ttBottom,"#6b8cff"],["L",cell.asset.ttLeft,"#C8A96E"]] as [string,number|undefined,string][]).map(([l,v,c])=>(
                <span key={l} style={{ fontSize:"0.44rem",fontWeight:700,color:c,fontFamily:"'JetBrains Mono',monospace" }}>{l}{ttLabel(v??2)}</span>
              ))}
            </div>
          </div>
          <div style={{ position:"absolute",inset:0,background:`${color}10`,pointerEvents:"none" }} />
        </>
      ):(
        <div style={{ height:"100%",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <span style={{ fontSize:"0.6rem",color:"rgba(255,255,255,0.1)",fontFamily:"'JetBrains Mono',monospace" }}>{canPlace?"[ ]":"·"}</span>
        </div>
      )}
    </div>
  );
}

// ─── Sovereign Asset Combat (5-phase economic warfare engine) ─────────────────
function SovereignArena({ assets }:{ assets:ArenaAsset[] }) {
  const [filter,   setFilter]   = useState("all");
  const [sel3,     setSel3]     = useState<string[]>([]);
  const [agent,    setAgent]    = useState(AGENTS[0]);
  const [wager,    setWager]    = useState(0.5);
  const [wTok,     setWTok]     = useState<"SOL"|"USDC"|"ABX">("SOL");
  const [pink,     setPink]     = useState(false);
  const [match,    setMatch]    = useState<MatchState|null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const cats = ["all",...Array.from(new Set(assets.map(a=>a.category)))];
  const shown = assets.filter(a=>filter==="all"||a.category===filter);

  useEffect(()=>{ if(logRef.current) logRef.current.scrollTop=logRef.current.scrollHeight; },[match?.log]);

  function toggleSel(id:string) {
    if (match) return;
    setSel3(p=>p.includes(id)?p.filter(x=>x!==id):p.length>=3?p:[...p,id]);
  }

  function launchMatch() {
    if (sel3.length!==3) return;
    const playerHand = sel3.map(id=>enrichTT(assets.find(a=>a.id===id)!));
    const remaining  = assets.filter(a=>!sel3.includes(a.id));
    const agentHand  = remaining.sort((a,b)=>(b.attributes?.power_level??0)-(a.attributes?.power_level??0)).slice(0,3).map(enrichTT);
    setMatch({
      phase:"treasury", board:Array(9).fill(null).map(()=>({asset:null,owner:null})),
      playerHand, agentHand, turn:"player",
      liquidity:6, maxLiquidity:6,
      macroEvent:null, activeAgent:agent,
      wager, wagerToken:wTok, pinkSlips:pink,
      log:[
        `[x402] Ante: ${wager} ${wTok} deducted via payment middleware`,
        `[PHASE 1] Treasury Setup — 6 LIQ allocated`,
        `[AGENT] ${agent.name} (${agent.style}) deployed — ${agent.buff}`,
        `[ARCH] Player squad: ${playerHand.map(a=>a.archetype).join(", ")}`,
      ],
      winner:null, abraEarned:0, prestige:0,
    });
  }

  async function advancePhase() {
    if (!match||match.phase==="done") return;

    if (match.phase==="treasury") {
      // Phase 2: deploy — player places first card
      setMatch(m=>m?{...m, phase:"deploy", log:[...m.log,"[PHASE 2] Strategic Deployment — place your assets"]}:m);
    } else if (match.phase==="macro") {
      // Phase 4: agent reactions
      const ev = match.macroEvent;
      const log = [...match.log,"[PHASE 4] Agent Reactions"];
      if (ev && agent.tactic==="hedge") log.push(`[${agent.name}] Hedge triggered — defending against ${ev.name}`);
      if (ev && agent.tactic==="yield") log.push(`[${agent.name}] Yield maximized under ${ev.name}`);
      setMatch(m=>m?{...m, phase:"agents", log}:m);
    } else if (match.phase==="agents") {
      // Phase 5: settlement
      const ps = scoreBoard(match.board,"player");
      const as = scoreBoard(match.board,"agent");
      const winner: "player"|"agent"|"draw" = ps>as?"player":as>ps?"agent":"draw";
      const abra = winner==="player" ? Math.round(match.playerHand.length*60 + (match.pinkSlips?120:0)) : 0;
      const pres = winner==="player" ? Math.round(wager*100) : 0;
      setMatch(m=>m?{...m, phase:"done", winner, abraEarned:abra, prestige:pres,
        log:[...m.log,`[PHASE 5] Settlement — Player: ${ps} | Sophia: ${as}`,
          winner==="player"?`[VICTORY] +${abra} $ABRA earned, +${pres} prestige`:`[DEFEATED] Sophia holds the position`]}:m);
    }
  }

  async function placeCard(cellIdx:number) {
    if (!match||match.turn!=="player"||match.board[cellIdx].asset) return;
    if (!match.playerHand.length) return;
    const liqCost = ARCH_CFG[match.playerHand[0].archetype??"Aggro"]?.liqCost??2;
    if (match.liquidity<liqCost) return; // not enough liquidity
    const card = match.playerHand[0];
    const b2   = applyFlips(match.board.map((c,i)=>i===cellIdx?{asset:card,owner:"player" as Owner}:c),cellIdx,"player");
    const h2   = match.playerHand.slice(1);
    const log2 = [...match.log,`[DEPLOY] ${card.name} [${card.archetype}] placed — cost ${liqCost} LIQ`];
    const liq2 = match.liquidity - liqCost;

    // Check if we should trigger macro event
    const allPlaced = b2.every(c=>!!c.asset)||(!h2.length&&!match.agentHand.length);
    if (allPlaced) {
      // Jump to settlement
      const ps=scoreBoard(b2,"player"); const as=scoreBoard(b2,"agent");
      const winner: "player"|"agent"|"draw"=ps>as?"player":as>ps?"agent":"draw";
      const abra=winner==="player"?Math.round(h2.length*60+(match.pinkSlips?120:0)):0;
      setMatch(m=>m?{...m,board:b2,playerHand:h2,liquidity:liq2,turn:"agent",phase:"done",winner,abraEarned:abra,prestige:winner==="player"?Math.round(match.wager*100):0,
        log:[...log2,`[SETTLE] Player: ${ps} | Sophia: ${as} — ${winner.toUpperCase()}`]}:m);
      return;
    }

    setMatch(m=>m?{...m,board:b2,playerHand:h2,liquidity:liq2,turn:"agent",log:log2}:m);

    // Agent places after 900ms, then draw macro event if board half full
    setTimeout(()=>{
      setMatch(prev=>{
        if (!prev||prev.turn!=="agent"||!prev.agentHand.length) return prev;
        const ac=prev.agentHand[0];
        const ei=prev.board.findIndex(c=>!c.asset);
        if (ei===-1) return prev;
        const b3=applyFlips(prev.board.map((c,i)=>i===ei?{asset:ac,owner:"agent" as Owner}:c),ei,"agent");
        const h3=prev.agentHand.slice(1);
        const log3=[...prev.log,`[SOPHIA] ${ac.name} [${ac.archetype}] placed at [${ei}] — ${prev.activeAgent.tactic} tactic`];
        const liq3=Math.min(prev.maxLiquidity,prev.liquidity+2); // regen 2 per round

        // Trigger macro event when 4-6 cells filled
        const filled=b3.filter(c=>!!c.asset).length;
        if (filled>=4&&!prev.macroEvent) {
          const ev=MACRO_EVENTS[Math.floor(Math.abs(Math.sin(Date.now()))*MACRO_EVENTS.length)];
          return {...prev,board:b3,agentHand:h3,liquidity:liq3,turn:"player",phase:"macro",macroEvent:ev,
            log:[...log3,`[MACRO] ${ev.name} — ${ev.desc}`]};
        }
        const allDone=b3.every(c=>!!c.asset)||(!prev.playerHand.length&&!h3.length);
        if (allDone) {
          const ps=scoreBoard(b3,"player");const as=scoreBoard(b3,"agent");
          const w: "player"|"agent"|"draw"=ps>as?"player":as>ps?"agent":"draw";
          const ab=w==="player"?Math.round(prev.playerHand.length*60+(prev.pinkSlips?120:0)):0;
          return {...prev,board:b3,agentHand:h3,liquidity:liq3,turn:"player",phase:"done",winner:w,abraEarned:ab,prestige:w==="player"?Math.round(prev.wager*100):0,
            log:[...log3,`[SETTLE] Player: ${ps} | Sophia: ${as} — ${w.toUpperCase()}`]};
        }
        return {...prev,board:b3,agentHand:h3,liquidity:liq3,turn:"player",log:log3};
      });
    },900);
  }

  const inMatch = !!match && match.phase !== "done";

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:"0.875rem" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"0.5rem",marginBottom:"0.25rem" }}>
          <div>
            <h2 style={{ fontWeight:900,fontSize:"1rem",letterSpacing:"-0.02em",margin:"0 0 2px", background:"linear-gradient(135deg,#D4AF37,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
              Sovereign Asset Combat
            </h2>
            <p style={{ fontSize:"0.52rem",color:"rgba(255,255,255,0.32)",margin:0,fontFamily:"'JetBrains Mono',monospace" }}>
              5-phase economic warfare · Archetype system · Macro events · Liquidity engine
            </p>
          </div>
          {/* Category filter */}
          <div style={{ display:"flex",gap:"0.2rem",flexWrap:"wrap" }}>
            {cats.slice(0,7).map(cat=>(
              <button key={cat} onClick={()=>setFilter(cat)} style={{ padding:"0.2rem 0.45rem",borderRadius:"4px",fontSize:"0.54rem",fontWeight:filter===cat?700:400,border:`1px solid ${filter===cat?(CAT_COLOR[cat]??"#6b8cff"):"rgba(255,255,255,0.07)"}`,background:filter===cat?`${CAT_COLOR[cat]??"#6b8cff"}12`:"transparent",color:filter===cat?(CAT_COLOR[cat]??"#6b8cff"):"rgba(255,255,255,0.36)",cursor:"pointer" }}>
                {cat==="all"?"All":cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pre-match setup */}
      {!match&&(
        <div style={{ padding:"0.875rem 1rem",background:"rgba(6,8,16,0.97)",border:"1px solid rgba(212,175,55,0.2)",borderRadius:"12px",marginBottom:"1rem" }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr auto",gap:"1rem",alignItems:"start" }}>
            <div>
              <div style={{ fontSize:"0.58rem",fontWeight:700,color:"#f0f0f0",marginBottom:"0.4rem" }}>
                {sel3.length===0&&"Select 3 assets to deploy"}
                {sel3.length>0&&sel3.length<3&&`${sel3.length}/3 selected — ${3-sel3.length} more`}
                {sel3.length===3&&"Squad ready — configure match"}
              </div>
              {sel3.length===3&&(
                <div style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.35)",fontFamily:"'JetBrains Mono',monospace" }}>
                  Archetypes: {sel3.map(id=>assets.find(a=>a.id===id)?.archetype).join(" · ")}
                </div>
              )}
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:"0.5rem",minWidth:"220px" }}>
              {/* Agent */}
              <div style={{ display:"flex",gap:"0.22rem",flexWrap:"wrap" }}>
                {AGENTS.map(a=>(
                  <button key={a.id} onClick={()=>setAgent(a)} style={{ padding:"0.18rem 0.4rem",borderRadius:"4px",fontSize:"0.46rem",fontWeight:agent.id===a.id?700:400,border:`1px solid ${agent.id===a.id?a.color+"44":"rgba(255,255,255,0.07)"}`,background:agent.id===a.id?`${a.color}14`:"transparent",color:agent.id===a.id?a.color:"rgba(255,255,255,0.36)",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>
                    {a.name}
                  </button>
                ))}
              </div>
              {/* Wager */}
              <div style={{ display:"flex",gap:"0.22rem",alignItems:"center" }}>
                <div style={{ display:"flex",alignItems:"center",gap:"0.22rem",padding:"0.18rem 0.4rem",borderRadius:"4px",background:"rgba(96,165,250,0.07)",border:"1px solid rgba(96,165,250,0.18)" }}>
                  <span style={{ width:"4px",height:"4px",borderRadius:"50%",background:"#60A5FA",flexShrink:0 }} />
                  <span style={{ fontSize:"0.44rem",color:"#60A5FA",fontFamily:"'JetBrains Mono',monospace",fontWeight:700 }}>x402 {wager} {wTok}</span>
                </div>
                {(["SOL","USDC","ABX"] as const).map(t=>(
                  <button key={t} onClick={()=>setWTok(t)} style={{ padding:"0.15rem 0.35rem",borderRadius:"3px",fontSize:"0.44rem",fontWeight:wTok===t?700:400,border:`1px solid ${wTok===t?"rgba(255,255,255,0.28)":"rgba(255,255,255,0.07)"}`,background:wTok===t?"rgba(255,255,255,0.07)":"transparent",color:wTok===t?"#f0f0f0":"rgba(255,255,255,0.28)",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>{t}</button>
                ))}
              </div>
              {/* Pink slips */}
              <div style={{ display:"flex",alignItems:"center",gap:"0.4rem" }}>
                <button onClick={()=>setPink(p=>!p)} style={{ width:"26px",height:"14px",borderRadius:"100px",border:"none",cursor:"pointer",background:pink?"#f26b6b":"rgba(255,255,255,0.08)",position:"relative",flexShrink:0,transition:"background 0.2s" }}>
                  <span style={{ position:"absolute",top:"1px",left:pink?"12px":"1px",width:"12px",height:"12px",borderRadius:"50%",background:"#fff",transition:"left 0.2s",display:"block" }} />
                </button>
                <span style={{ fontSize:"0.48rem",color:pink?"#f26b6b":"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace",fontWeight:pink?700:400 }}>
                  Pink Slips {pink?"ON":"OFF"}
                </span>
              </div>
              <button onClick={launchMatch} disabled={sel3.length!==3} style={{ padding:"0.45rem 0.875rem",borderRadius:"7px",border:"none",fontWeight:800,fontSize:"0.68rem",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em",cursor:sel3.length===3?"pointer":"not-allowed",background:sel3.length===3?"linear-gradient(135deg,#D4AF37,#FF6B35)":"rgba(255,255,255,0.05)",color:sel3.length===3?"#000":"rgba(255,255,255,0.18)",boxShadow:sel3.length===3?"0 0 18px rgba(212,175,55,0.3)":"none" }}>
                {sel3.length===3?"Deploy Squad →":`Select ${3-sel3.length} more`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active match */}
      {match&&(
        <div style={{ marginBottom:"1rem" }}>
          {/* Phase indicator */}
          <div style={{ display:"flex",gap:"0.25rem",marginBottom:"0.625rem",flexWrap:"wrap" }}>
            {["treasury","deploy","macro","agents","settle"].map((ph,i)=>{
              const phases = ["treasury","deploy","macro","agents","settle","done"];
              const current = phases.indexOf(match.phase);
              const isActive = ph===match.phase||( ph==="settle"&&match.phase==="done");
              const isDone   = phases.indexOf(ph)<current;
              return (
                <div key={ph} style={{ padding:"0.2rem 0.5rem",borderRadius:"4px",fontSize:"0.46rem",fontWeight:isActive?700:400,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.06em",background:isActive?"rgba(212,175,55,0.12)":isDone?"rgba(20,241,149,0.07)":"rgba(255,255,255,0.03)",color:isActive?"#D4AF37":isDone?"#14F195":"rgba(255,255,255,0.22)",border:`1px solid ${isActive?"rgba(212,175,55,0.3)":isDone?"rgba(20,241,149,0.15)":"rgba(255,255,255,0.05)"}` }}>
                  {i+1}. {ph}
                </div>
              );
            })}
            <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:"0.35rem" }}>
              <span style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>LIQ</span>
              <div style={{ display:"flex",gap:"2px" }}>
                {Array.from({length:match.maxLiquidity}).map((_,i)=>(
                  <div key={i} style={{ width:"7px",height:"10px",borderRadius:"1px",background:i<match.liquidity?"#FBBF24":"rgba(255,255,255,0.07)",boxShadow:i<match.liquidity?"0 0 3px rgba(251,191,36,0.5)":"none" }} />
                ))}
              </div>
            </div>
          </div>

          {/* Macro event banner */}
          {match.macroEvent&&(
            <div style={{ padding:"0.5rem 0.75rem",background:`${match.macroEvent.color}0c`,border:`1px solid ${match.macroEvent.color}30`,borderRadius:"8px",marginBottom:"0.625rem" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.3rem" }}>
                <div>
                  <span style={{ fontSize:"0.52rem",fontWeight:700,color:match.macroEvent.color,fontFamily:"'JetBrains Mono',monospace" }}>[MACRO] {match.macroEvent.name}</span>
                  <span style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.38)",marginLeft:"0.5rem" }}>{match.macroEvent.desc}</span>
                </div>
                {match.phase==="macro"&&<button onClick={advancePhase} style={{ padding:"0.25rem 0.625rem",borderRadius:"5px",background:`${match.macroEvent.color}14`,border:`1px solid ${match.macroEvent.color}33`,color:match.macroEvent.color,fontSize:"0.52rem",fontWeight:700,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>Resolve</button>}
              </div>
            </div>
          )}

          {/* Board + hands */}
          {match.phase!=="done"?(
            <div style={{ display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:"0.75rem",alignItems:"start" }}>
              {/* Player hand */}
              <div>
                <div style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.25rem" }}>YOUR HAND ({match.playerHand.length})</div>
                {match.playerHand.map(a=>{
                  const cost=ARCH_CFG[a.archetype??"Aggro"]?.liqCost??2;
                  const canAfford=match.liquidity>=cost;
                  return (
                    <div key={a.id} style={{ padding:"0.3rem 0.4rem",background:"rgba(20,241,149,0.06)",border:`1px solid ${canAfford?"rgba(20,241,149,0.18)":"rgba(255,255,255,0.06)"}`,borderRadius:"5px",marginBottom:"0.22rem" }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                        <span style={{ fontSize:"0.5rem",color:canAfford?"#14F195":"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"120px" }}>{a.name}</span>
                        <span style={{ fontSize:"0.44rem",color:"#FBBF24",fontFamily:"'JetBrains Mono',monospace",flexShrink:0 }}>{cost} LIQ</span>
                      </div>
                      <ArchBadge arch={a.archetype} />
                    </div>
                  );
                })}
              </div>

              {/* Board */}
              <div style={{ width:"min-content" }}>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,90px)",gap:"3px",background:"rgba(255,255,255,0.05)",padding:"3px",borderRadius:"9px",marginBottom:"0.4rem" }}>
                  {match.board.map((cell,i)=>(
                    <BoardCell key={i} cell={cell} idx={i}
                      canPlace={!cell.asset&&match.turn==="player"&&match.phase==="deploy"&&match.playerHand.length>0&&match.liquidity>=(ARCH_CFG[match.playerHand[0]?.archetype??"Aggro"]?.liqCost??2)}
                      onPlace={placeCard} />
                  ))}
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",fontSize:"0.46rem",fontFamily:"'JetBrains Mono',monospace" }}>
                  <span style={{ color:"#14F195" }}>{scoreBoard(match.board,"player")} owned</span>
                  <span style={{ color:match.turn==="player"?"#14F195":"#f26b6b",fontWeight:700 }}>{match.turn==="player"?"YOUR TURN":"SOPHIA..."}</span>
                  <span style={{ color:"#f26b6b" }}>{scoreBoard(match.board,"agent")} owned</span>
                </div>
              </div>

              {/* Agent hand */}
              <div>
                <div style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.25rem",textAlign:"right" }}>SOPHIA HAND ({match.agentHand.length})</div>
                {match.agentHand.map(a=>(
                  <div key={a.id} style={{ padding:"0.3rem 0.4rem",background:"rgba(242,107,107,0.06)",border:"1px solid rgba(242,107,107,0.18)",borderRadius:"5px",marginBottom:"0.22rem",textAlign:"right" }}>
                    <div style={{ fontSize:"0.5rem",color:"#f26b6b",fontFamily:"'JetBrains Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{a.name}</div>
                    <ArchBadge arch={a.archetype} />
                  </div>
                ))}
              </div>
            </div>
          ):(
            // Settlement result
            <div style={{ padding:"1.25rem",background:"rgba(6,8,16,0.97)",border:`1px solid ${match.winner==="player"?"rgba(20,241,149,0.3)":match.winner==="draw"?"rgba(251,191,36,0.3)":"rgba(242,107,107,0.3)"}`,borderRadius:"12px",textAlign:"center" }}>
              <div style={{ fontWeight:900,fontSize:"1.4rem",color:match.winner==="player"?"#14F195":match.winner==="draw"?"#FBBF24":"#f26b6b",letterSpacing:"-0.02em",marginBottom:"0.4rem" }}>
                {match.winner==="player"?"VICTORY":match.winner==="draw"?"DRAW":"DEFEATED"}
              </div>
              {match.abraEarned>0&&<div style={{ fontSize:"0.72rem",fontWeight:700,color:"#D4AF37",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.25rem" }}>+{match.abraEarned} $ABRA</div>}
              {match.prestige>0&&<div style={{ fontSize:"0.58rem",color:"#a855f7",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.5rem" }}>+{match.prestige} Prestige</div>}
              {match.pinkSlips&&match.winner==="player"&&<div style={{ fontSize:"0.52rem",color:"#f26b6b",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.5rem" }}>Pink Slips: RWA metadata transferred to winner's vault</div>}
              <button onClick={()=>{setMatch(null);setSel3([]);}} style={{ padding:"0.4rem 0.875rem",borderRadius:"7px",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.5)",fontSize:"0.62rem",fontFamily:"'JetBrains Mono',monospace",cursor:"pointer" }}>
                New Match
              </button>
            </div>
          )}

          {/* Battle log */}
          {match.log.length>0&&(
            <div ref={logRef} style={{ marginTop:"0.625rem",background:"rgba(2,3,10,0.97)",border:"1px solid rgba(107,140,255,0.1)",borderRadius:"7px",padding:"0.4rem 0.625rem",maxHeight:"90px",overflowY:"auto",fontFamily:"'JetBrains Mono',monospace" }}>
              {match.log.slice(-8).map((l,i)=>(
                <p key={i} style={{ margin:"0 0 0.16rem",fontSize:"0.5rem",color:`rgba(96,165,250,${Math.max(0.2,0.9-i*0.08)})`,lineHeight:1.4 }}>{l}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Card grid — 2 columns on mobile */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,220px),1fr))",gap:"0.75rem" }}>
        {shown.map(a=>(
          <ArenaCard key={a.id} asset={a}
            selected={sel3.includes(a.id)}
            onSelect={!match?()=>toggleSel(a.id):undefined}
          />
        ))}
        {shown.length===0&&(
          <div style={{ gridColumn:"1/-1",padding:"2.5rem",textAlign:"center",fontSize:"0.62rem",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace" }}>
            NO ASSETS IN THIS CATEGORY
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────
export function TerminalArenaSkeleton() {
  return (
    <div>
      <div style={{ height:"34px",background:"rgba(2,3,10,0.97)",borderBottom:"1px solid rgba(255,255,255,0.05)",animation:"pulse 1.5s ease-in-out infinite" }} />
      <div style={{ padding:"1.25rem",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"0.75rem" }}>
        {Array.from({length:6}).map((_,i)=>(
          <div key={i} style={{ height:340,borderRadius:"12px",background:"rgba(6,8,16,0.97)",border:"1px solid rgba(255,255,255,0.04)",animation:`pulse ${1.3+i*0.08}s ease-in-out infinite` }} />
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function TerminalArena() {
  const [assets, setAssets]  = useState<ArenaAsset[]>([]);
  const [ticks,  setTicks]   = useState<SoldTick[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,  setError]   = useState<string|null>(null);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try {
        const res=await fetch("/api/cards");
        const data=await res.json();
        if (!cancelled&&data.ok){ setAssets(data.assets); setTicks(buildSoldTape(data.assets)); }
      } catch { if (!cancelled) setError("Oracle unavailable"); }
      finally  { if (!cancelled) setLoading(false); }
    })();
    return ()=>{ cancelled=true; };
  },[]);

  if (loading) return <TerminalArenaSkeleton />;

  return (
    <div>
      <style>{`
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
      `}</style>
      {error&&<div style={{ padding:"0.5rem 1rem",background:"rgba(242,107,107,0.07)",fontSize:"0.56rem",color:"#f26b6b",fontFamily:"'JetBrains Mono',monospace" }}>[ORACLE] {error}</div>}
      <SoldTape ticks={ticks} />
      <div style={{ padding:"1.25rem" }}>
        <TokenizeCTA />
        <StockPanel assets={assets} />
        <MetalsStrip assets={assets} />
        <SovereignArena assets={assets} />
      </div>
    </div>
  );
}