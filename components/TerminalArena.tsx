// FILE: components/TerminalArena.tsx
// Sovereign Terminal — Feed hierarchy: Spirits → Watches → Macro/Agents → Arena (Cards)
// Sticky command bar at top. Per-asset acquire_url from inventory.json.
// Comics → Metropolis. Spirits → Baxus per-product. Watches → Courtyard.
// Tab filter: "Watches" shows all 13 watch assets (merged from Timepieces).
// Stats (ATK/DEF/SPD) hidden from card face — shown only inside arena board.
// Provenance banner: explains tokenized ownership model.
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getLoopscaleLiquidity, calcEloChange, getRank, RANK_COLORS, type EloState } from "@/lib/loopscale";
import { GameModesHub } from "@/components/GameModes";
import { RWACharts } from "@/components/RWACharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ArenaAsset {
  id: string; name: string; category: string; ticker: string;
  grade: string; gradingCo: string; vaultLocation: string;
  priceUsd: number; last_sold_price: number; last_sold_source?: string;
  change24h: number; imagePath?: string | null; videoPath?: string | null;
  rarity: string; atk: number; def: number; speed: number;
  circuitScore: number; defenseLevel: string;
  protected: boolean; staked: boolean; apy?: number;
  is_duel_eligible?: boolean; arena_buff?: string;
  acquire_url?: string;
  attributes?: { power_level: number };
  can_borrow?: boolean; ltv?: number;
  archetype?: string; archetype_color?: string;
  ttTop?: number; ttRight?: number; ttBottom?: number; ttLeft?: number;
}

interface SoldTick {
  id: string; name: string; price: number; category: string;
  source: string; ts: number; ticker: string;
}

// ─── Macro events ─────────────────────────────────────────────────────────────
const MACRO_EVENTS = [
  { id:"fed_hike",   name:"Fed Rate Hike",        desc:"Legacy assets +DEF. Speculative assets -LIQ.", color:"#FBBF24",
    effects:{ Tank:{def:+12}, Yield:{def:+8,liq:+5}, Aggro:{liq:-8}, Volatility:{atk:+5,liq:-12} } },
  { id:"risk_off",   name:"Crypto Risk-Off",       desc:"Control assets stabilize. Momentum craters.", color:"#f26b6b",
    effects:{ Tank:{def:+15}, Control:{def:+10}, Aggro:{atk:-10,liq:-8}, Volatility:{atk:-15,liq:-15} } },
  { id:"gold_surge", name:"Commodity Surge",       desc:"Metals and spirits gain yield. Equities pressured.", color:"#D4AF37",
    effects:{ Yield:{def:+15,liq:+10}, Tank:{def:+8}, Control:{atk:-5} } },
  { id:"sol_bull",   name:"Solana Liquidity Inflow",desc:"On-chain assets surge. Settlement velocity up.", color:"#9945FF",
    effects:{ Aggro:{atk:+12,liq:+8}, Volatility:{atk:+15,liq:+10}, Yield:{liq:+5} } },
  { id:"treasury",   name:"Sovereign Treasury Shock",desc:"Reserve assets protected. Speculative burn.", color:"#60A5FA",
    effects:{ Tank:{def:+20}, Yield:{def:+12}, Aggro:{atk:-8,liq:-10}, Volatility:{liq:-18} } },
] as const;
type MacroEvent = typeof MACRO_EVENTS[number];

// ─── Sophia agents ────────────────────────────────────────────────────────────
const AGENTS = [
  { id:"HED", name:"Sophia-Hed", role:"Hedge Strategist",  style:"Defensive", buff:"Tank/Yield +20% DEF",   color:"#14F195", tactic:"hedge"     },
  { id:"REB", name:"Sophia-Reb", role:"Rebalance Engine",  style:"Adaptive",  buff:"All +10% on rebalance", color:"#6b8cff", tactic:"rebalance"  },
  { id:"YLD", name:"Sophia-Yld", role:"Yield Optimizer",   style:"Economic",  buff:"Yield +2x LIQ",         color:"#C8A96E", tactic:"yield"      },
  { id:"CGD", name:"Sophia-Cgd", role:"Circuit Guardian",  style:"Control",   buff:"Shield -40% dmg",       color:"#a855f7", tactic:"guard"      },
] as const;

const ARCH_CFG: Record<string, { label:string; color:string; liqCost:number }> = {
  Tank:       { label:"Tank",       color:"#14F195", liqCost:2 },
  Aggro:      { label:"Aggro",      color:"#FF6B35", liqCost:3 },
  Control:    { label:"Control",    color:"#a855f7", liqCost:2 },
  Yield:      { label:"Yield",      color:"#C8A96E", liqCost:1 },
  Volatility: { label:"Volatility", color:"#f26b6b", liqCost:4 },
};

const CAT_COLOR: Record<string, string> = {
  Pokemon:"#FBBF24", "One Piece":"#f26b6b", Comics:"#a855f7",
  Metals:"#D4AF37", Stocks:"#14F195", Watches:"#6b8cff",
  Sports:"#fb923c", Spirits:"#FF8C00", Racehorses:"#22c55e",
};

// ─── ELO ──────────────────────────────────────────────────────────────────────
const DEFAULT_ELO: EloState = { rating:1000, rank:"Bronze", wins:0, losses:0, streak:0, prestige:0, abraEarned:0 };
function loadElo(): EloState {
  if (typeof window==="undefined") return DEFAULT_ELO;
  try { return JSON.parse(sessionStorage.getItem("abraxas_elo")??"{}") || DEFAULT_ELO; } catch { return DEFAULT_ELO; }
}
function saveElo(s: EloState) {
  if (typeof window!=="undefined") sessionStorage.setItem("abraxas_elo", JSON.stringify(s));
}

const DAILY_QUESTS = [
  { id:"win3",     label:"Win 3 battles",         reward:150, progress:0, goal:3 },
  { id:"spirits",  label:"Deploy a Spirits asset", reward:100, progress:0, goal:1 },
  { id:"tokenize", label:"Tokenize 1 new asset",   reward:200, progress:0, goal:1 },
  { id:"streak",   label:"Get a 2-win streak",     reward:120, progress:0, goal:2 },
];

// ─── TT helpers ───────────────────────────────────────────────────────────────
function statToTT(v: number): number { return Math.max(2, Math.min(10, Math.round(v/10))); }
function ttLabel(v: number): string  { return v>=10?"A":String(v); }
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
type Owner="player"|"agent"|null;
interface Cell { asset:ArenaAsset|null; owner:Owner }
function applyFlips(board:Cell[], idx:number, owner:Owner): Cell[] {
  const b=board.map(c=>({...c})); const placed=b[idx]; if(!placed.asset||!owner) return b;
  for(const [ni,my,their] of ADJ[idx]){ const nb=b[ni]; if(!nb.asset||nb.owner===owner) continue; if((placed.asset[my]??1)>(nb.asset[their]??1)) b[ni]={...nb,owner}; }
  return b;
}
function scoreBoard(board:Cell[], owner:Owner){ return board.filter(c=>c.owner===owner).length; }

// ─── Match state ──────────────────────────────────────────────────────────────
interface MatchState {
  phase:"treasury"|"deploy"|"macro"|"agents"|"settle"|"done";
  board:Cell[]; playerHand:ArenaAsset[]; agentHand:ArenaAsset[];
  turn:"player"|"agent"; liquidity:number; maxLiquidity:number;
  macroEvent:MacroEvent|null; activeAgent:typeof AGENTS[number];
  wager:number; wagerToken:"SOL"|"USDC"|"ABX"; pinkSlips:boolean;
  log:string[]; winner:"player"|"agent"|"draw"|null; abraEarned:number; prestige:number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtUsd(v:number): string {
  if(v>=1_000_000) return `$${(v/1_000_000).toFixed(2)}M`;
  if(v>=1_000)     return `$${(v/1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}
function timeAgo(ts:number): string {
  const s=Math.floor((Date.now()-ts)/1000);
  if(s<60) return `${s}s ago`; if(s<3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}
// Curated ticks from partner platforms + Abraxas-native
const PARTNER_TICKS = [
  { id:"bx-pappy",   name:"Pappy Van Winkle 2021",         price:2400,   category:"Spirits",    source:"Baxus",         ticker:"PAPPY",   ts:Date.now()-60000  },
  { id:"ct-rxsub",   name:"Rolex Submariner",               price:11000,  category:"Watches",    source:"Courtyard",     ticker:"RXSUB",   ts:Date.now()-180000 },
  { id:"cc-char99",  name:"1999 Charizard PSA 10",          price:550000, category:"Pokemon",    source:"Collector Crypt",ticker:"CHAR99",  ts:Date.now()-300000 },
  { id:"bx-ltmill",  name:"Littlemill 1965 Bottled 1998",   price:2100,   category:"Spirits",    source:"Baxus",         ticker:"LTML65",  ts:Date.now()-420000 },
  { id:"abx-af15",   name:"Amazing Fantasy #15 (1962)",     price:525000, category:"Comics",     source:"Abraxas",       ticker:"AF15",    ts:Date.now()-540000 },
  { id:"ct-csant",   name:"Cartier Santos Large Blue",       price:11000,  category:"Watches",    source:"Courtyard",     ticker:"CSANT",   ts:Date.now()-660000 },
  { id:"bx-caroni",  name:"Caroni 1998 23yr Single Cask",   price:1950,   category:"Spirits",    source:"Baxus",         ticker:"CARON98", ts:Date.now()-780000 },
  { id:"abx-sec73",  name:"Secretariat 1973",               price:500000, category:"Racehorses", source:"Abraxas",       ticker:"SECRTAT", ts:Date.now()-900000 },
  { id:"abx-gold",   name:"Gold 1oz (LBMA)",                price:4733,   category:"Metals",     source:"Abraxas",       ticker:"XAUt",    ts:Date.now()-1020000},
];
function buildSoldTape(assets:ArenaAsset[]): SoldTick[] {
  const native = assets.filter(a=>a.last_sold_price>0)
    .map(a=>({ id:a.id, name:a.name, price:a.last_sold_price, category:a.category,
      source:a.last_sold_source??"Abraxas",
      ts:Date.now()-Math.floor(Math.abs(Math.sin(a.id.length*9301))*7_200_000), ticker:a.ticker }))
    .sort((a,b)=>b.price-a.price).slice(0,18);
  return [...PARTNER_TICKS, ...native];
}

// ─── Sold tape ────────────────────────────────────────────────────────────────
function SoldTape({ ticks }:{ ticks:SoldTick[] }) {
  if(!ticks.length) return null;
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

// ─── Asset image — video for watches, image for everything else ───────────────
function AssetImage({ asset, height=150 }:{ asset:ArenaAsset; height?:number }) {
  const [err,setErr]=useState(false);
  const catColor=CAT_COLOR[asset.category]??"#6b8cff";

  if(asset.videoPath && !err) return (
    <div style={{ position:"relative",height,background:"rgba(6,8,16,0.98)",overflow:"hidden" }}>
      <video src={asset.videoPath} autoPlay muted loop playsInline onError={()=>setErr(true)}
        style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }} />
      <div style={{ position:"absolute",bottom:0,left:0,right:0,height:"40%",background:"linear-gradient(to top,rgba(6,8,16,0.9),transparent)",pointerEvents:"none" }} />
      <div style={{ position:"absolute",top:"0.3rem",left:"0.3rem",padding:"0.08rem 0.28rem",borderRadius:"3px",background:"rgba(107,140,255,0.2)",border:"1px solid rgba(107,140,255,0.4)" }}>
        <span style={{ fontSize:"0.4rem",fontWeight:700,color:"#6b8cff",letterSpacing:"0.08em",fontFamily:"'JetBrains Mono',monospace" }}>VIDEO</span>
      </div>
    </div>
  );

  const CAT_SVG: Record<string,string> = {
    Pokemon:"⬡",Spirits:"◈","One Piece":"◉",Comics:"◫",
    Metals:"◆",Stocks:"▲",Watches:"◎",Sports:"◉",Racehorses:"◈",
  };
  const catIcon = CAT_SVG[asset.category]??"⬡";

  if(!asset.imagePath||err) return (
    <div style={{ height,background:`linear-gradient(145deg,${catColor}10 0%,rgba(6,8,16,0.99) 60%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"0.25rem",padding:"0.75rem",position:"relative",overflow:"hidden" }}>
      {/* Subtle rune grid background */}
      <div style={{ position:"absolute",inset:0,opacity:0.04,fontSize:"1.8rem",display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"center",gap:"0.5rem",letterSpacing:"0.2em",color:catColor,userSelect:"none",pointerEvents:"none" }}>
        {Array.from({length:12}).map((_,i)=><span key={i}>{catIcon}</span>)}
      </div>
      {/* Category badge */}
      <div style={{ padding:"0.1rem 0.4rem",borderRadius:"3px",background:`${catColor}18`,border:`1px solid ${catColor}30`,marginBottom:"0.1rem" }}>
        <span style={{ fontSize:"0.42rem",fontWeight:800,color:catColor,letterSpacing:"0.14em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace" }}>{asset.category}</span>
      </div>
      {/* Large icon */}
      <div style={{ fontSize:"2rem",color:catColor,opacity:0.6,lineHeight:1,textShadow:`0 0 20px ${catColor}` }}>{catIcon}</div>
      {/* Asset name */}
      <span style={{ fontSize:"0.64rem",fontWeight:900,color:"#f0f0f0",textAlign:"center",lineHeight:1.3,padding:"0 0.25rem",maxWidth:"90%" }}>{asset.name}</span>
      {/* Grade */}
      <span style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.35)",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.06em" }}>{asset.grade}</span>
      {/* Glow line bottom */}
      <div style={{ position:"absolute",bottom:0,left:0,right:0,height:"2px",background:`linear-gradient(90deg,transparent,${catColor}60,transparent)` }} />
    </div>
  );

  return (
    <div style={{ position:"relative",height,background:"rgba(6,8,16,0.98)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset.imagePath} alt={asset.name} onError={()=>setErr(true)}
        style={{ width:"100%",height:"100%",objectFit:"contain",display:"block" }} loading="lazy" />
      <div style={{ position:"absolute",bottom:0,left:0,right:0,height:"40%",background:"linear-gradient(to top,rgba(6,8,16,0.9),transparent)",pointerEvents:"none" }} />
    </div>
  );
}

// ─── Acquire URL resolver ─────────────────────────────────────────────────────
function getAcquireUrl(asset: ArenaAsset): string {
  if(asset.acquire_url) return asset.acquire_url;
  if(asset.category==="Spirits")  return "https://www.baxus.co/";
  if(asset.category==="Watches")  return "https://www.courtyard.io/";
  if(asset.category==="Comics")   return "https://www.metropoliscomics.com/?hl=en-US";
  return "https://gacha.collectorcrypt.com/#pokemon";
}

// ─── Arena card — no stats on face (clean) ────────────────────────────────────
function ArenaCard({ asset, selected, owner, onSelect, compact }:{
  asset:ArenaAsset; selected?:boolean; owner?:Owner; onSelect?:(a:ArenaAsset)=>void; compact?:boolean;
}) {
  const imgH=compact?90:150;
  const isHorse = asset.category==="Racehorses";
  const catColor=CAT_COLOR[asset.category]??"#6b8cff";
  const archColor=asset.archetype_color??catColor;
  const borderColor=owner==="player"?"#14F195":owner==="agent"?"#f26b6b":selected?"#D4AF37":`${catColor}30`;
  const acquireUrl=getAcquireUrl(asset);
  const q = asset.can_borrow && asset.ltv ? getLoopscaleLiquidity(asset.priceUsd, asset.category) : null;

  const [hov,setHov]=useState(false);
  const glowIntensity = selected?"40":owner?"30":hov?"22":"08";
  const borderIntensity = selected?"60":owner?"70":hov?"45":"30";

  return (
    <div
      onClick={()=>onSelect?.(asset)}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        position:"relative",borderRadius:"12px",overflow:"hidden",
        background:`linear-gradient(145deg,${catColor}06,rgba(6,8,16,0.99))`,
        border:`1px solid ${catColor}${borderIntensity}`,
        boxShadow:`0 0 ${hov||selected?24:8}px ${catColor}${glowIntensity},inset 0 0 ${hov?12:0}px ${catColor}08`,
        cursor:onSelect?"pointer":"default",
        transition:"border-color 0.18s,box-shadow 0.18s,transform 0.18s",
        transform:hov&&onSelect?`translateY(-3px) scale(1.005)`:"none",
      }}>
      {asset.protected&&(
        <div style={{ position:"absolute",top:"0.3rem",right:"0.3rem",zIndex:4,display:"flex",alignItems:"center",gap:"0.18rem",padding:"0.07rem 0.28rem",borderRadius:"3px",background:"rgba(212,175,55,0.15)",border:"1px solid rgba(212,175,55,0.4)" }}>
          <span style={{ width:"3px",height:"3px",borderRadius:"50%",background:"#D4AF37",animation:"pulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize:"0.38rem",fontWeight:700,color:"#D4AF37",letterSpacing:"0.08em",fontFamily:"'JetBrains Mono',monospace" }}>VAULT</span>
        </div>
      )}
      {owner&&<div style={{ position:"absolute",top:"0.3rem",left:"0.3rem",zIndex:4,width:"7px",height:"7px",borderRadius:"50%",background:owner==="player"?"#14F195":"#f26b6b" }} />}

      <AssetImage asset={asset} height={imgH} />

      <div style={{ padding:"0.45rem 0.5rem" }}>
        {/* Category badge — neon glow */}
        <div style={{ display:"flex",alignItems:"center",gap:"0.3rem",marginBottom:"0.3rem",flexWrap:"wrap" }}>
          <span style={{ fontSize:"0.44rem",fontWeight:900,padding:"0.12rem 0.4rem",borderRadius:"10px",background:`${catColor}18`,border:`1px solid ${catColor}45`,color:catColor,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.08em",textTransform:"uppercase",boxShadow:`0 0 8px ${catColor}20` }}>{asset.category}</span>
          {isHorse&&(asset as any).race_record&&<span style={{ fontSize:"0.42rem",color:"#22c55e",fontFamily:"'JetBrains Mono',monospace",fontWeight:700 }}>{(asset as any).race_record}</span>}
        </div>
        <div style={{ fontWeight:900,fontSize:"0.78rem",color:"#f0f0f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:"2px",letterSpacing:"-0.01em" }}>{asset.name}</div>

        {/* Category + archetype + buff — no ATK/DEF/SPD on card face */}
        <div style={{ display:"flex",alignItems:"center",gap:"0.25rem",marginBottom:"0.3rem",flexWrap:"wrap" }}>
          <span style={{ fontSize:"0.42rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>{asset.grade}</span>
          {asset.archetype&&(
            <span style={{ fontSize:"0.4rem",fontWeight:700,padding:"0.06rem 0.25rem",borderRadius:"3px",background:`${archColor}18`,border:`1px solid ${archColor}44`,color:archColor,fontFamily:"'JetBrains Mono',monospace" }}>
              {asset.archetype}
            </span>
          )}
          {asset.arena_buff&&(()=>{
            const bclr = asset.arena_buff==="Liquid Gold"?"#C8A96E":asset.arena_buff==="Precision Strike"?"#6b8cff":asset.arena_buff==="Thunderhooves"?"#22c55e":"#a855f7";
            return <span style={{ fontSize:"0.38rem",fontWeight:700,padding:"0.05rem 0.22rem",borderRadius:"3px",background:`${bclr}12`,border:`1px solid ${bclr}35`,color:bclr,fontFamily:"'JetBrains Mono',monospace" }}>{asset.arena_buff}</span>;
          })()}
        </div>

        {!compact&&(
          <>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"0.25rem" }}>
              <span style={{ fontWeight:800,fontSize:"0.82rem",fontVariantNumeric:"tabular-nums",fontFamily:"'JetBrains Mono',monospace" }}>{fmtUsd(asset.priceUsd)}</span>
              <span style={{ fontSize:"0.52rem",fontWeight:700,color:asset.change24h>=0?"#14F195":"#f26b6b",fontVariantNumeric:"tabular-nums" }}>
                {asset.change24h>=0?"+":""}{asset.change24h?.toFixed(2)}%
              </span>
            </div>

            {/* Loopscale borrow line */}
            {q&&(
              <div style={{ fontSize:"0.44rem",color:"rgba(20,241,149,0.6)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.25rem" }}>
                Borrow ${q.borrowLimit.toLocaleString()} USDC · {Math.round((asset.ltv??0.55)*100)}% LTV
              </div>
            )}

            <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.3rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
              {asset.last_sold_source} · {fmtUsd(asset.last_sold_price)} last sold
            </div>

            {asset.category==="Racehorses"?(
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.25rem" }}>
                <a href={acquireUrl} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{ display:"block",padding:"0.3rem",borderRadius:"5px",fontSize:"0.46rem",fontWeight:700,background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",color:"#22c55e",textAlign:"center",textDecoration:"none",fontFamily:"'JetBrains Mono',monospace" }}>
                  Acquire
                </a>
                <button onClick={e=>{e.stopPropagation();}} style={{ padding:"0.3rem",borderRadius:"5px",fontSize:"0.46rem",fontWeight:700,background:"rgba(255,107,53,0.12)",border:"1px solid rgba(255,107,53,0.35)",color:"#FF6B35",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>
                  Enter Race
                </button>
              </div>
            ):(
              <a href={acquireUrl} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{ display:"block",padding:"0.3rem",borderRadius:"5px",fontSize:"0.52rem",fontWeight:700,background:"rgba(200,169,110,0.1)",border:"1px solid rgba(200,169,110,0.22)",color:"#C8A96E",textAlign:"center",textDecoration:"none",fontFamily:"'JetBrains Mono',monospace" }}>
                Acquire
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Sticky command bar ───────────────────────────────────────────────────────
function CommandBar({ onScrollToArena }:{ onScrollToArena:()=>void }) {
  return (
    <div style={{ position:"sticky",top:"52px",zIndex:40,padding:"0.5rem 1.25rem",background:"rgba(2,3,10,0.92)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"0.5rem",flexWrap:"wrap" }}>
      <div style={{ display:"flex",gap:"0.4rem",alignItems:"center" }}>
        <button onClick={onScrollToArena} style={{ padding:"0.3rem 0.75rem",borderRadius:"6px",background:"linear-gradient(135deg,rgba(168,85,247,0.2),rgba(107,140,255,0.15))",border:"1px solid rgba(168,85,247,0.35)",color:"#a855f7",fontSize:"0.6rem",fontWeight:800,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em" }}>
          Enter Arena
        </button>
        <a href="/tokenize" style={{ padding:"0.3rem 0.75rem",borderRadius:"6px",background:"rgba(107,140,255,0.1)",border:"1px solid rgba(107,140,255,0.25)",color:"#6b8cff",fontSize:"0.6rem",fontWeight:700,textDecoration:"none",fontFamily:"'JetBrains Mono',monospace" }}>
          Tokenize Asset
        </a>
      </div>
      <div style={{ display:"flex",gap:"0.875rem",alignItems:"center" }}>
        {[["XAU","$4,733.39","#D4AF37"],["XAG","$72.91","#C0C0C0"],["NVDA","$211.48","#76B900"],["TSLA","$411.89","#CC0000"]].map(([l,v,c])=>(
          <span key={l} style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace" }}>
            {l} <span style={{ color:c,fontWeight:700 }}>{v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Provenance banner ────────────────────────────────────────────────────────
function ProvenanceBanner() {
  return (
    <div style={{ margin:"0 0 1.25rem",padding:"0.625rem 1rem",background:"rgba(107,140,255,0.05)",border:"1px solid rgba(107,140,255,0.12)",borderRadius:"10px",display:"flex",gap:"0.625rem",alignItems:"flex-start" }}>
      <span style={{ width:"5px",height:"5px",borderRadius:"50%",background:"#6b8cff",flexShrink:0,marginTop:"5px" }} />
      <p style={{ fontSize:"0.52rem",color:"rgba(255,255,255,0.42)",margin:0,lineHeight:1.65 }}>
        All listings represent <strong style={{ color:"rgba(255,255,255,0.7)" }}>owner-submitted tokenized assets</strong> on Abraxas Protocol. Each asset is a Token-2022 position on Solana with provenance metadata, grade certification, and vault custody. You can <a href="/tokenize" style={{ color:"#6b8cff" }}>tokenize your own assets</a>, assign them to a vault for yield, or deploy them in the Sovereign Arena.
      </p>
    </div>
  );
}

// ─── Section headers ──────────────────────────────────────────────────────────
// ─── Live Activity Feed ──────────────────────────────────────────────────────
const FEED_EVENTS = [
  { type:"pull",    user:"7xA3…mK9f", msg:"pulled a Legendary Secretariat",       asset:"Secretariat",      val:500000, color:"#FBBF24", time:12  },
  { type:"borrow",  user:"Db6R…xQ2p", msg:"borrowed 66,000 USDC against",          asset:"American Pharoah", val:66000,  color:"#14F195", time:28  },
  { type:"battle",  user:"CQ1U…dJGd", msg:"won 420 $ABRA battling with",           asset:"Amazing Fantasy",  val:420,    color:"#a855f7", time:45  },
  { type:"pull",    user:"9G4k…Fa2m", msg:"pulled Ultra Rare",                     asset:"Pappy Van Winkle", val:2400,   color:"#a855f7", time:71  },
  { type:"market",  user:"",          msg:"RWA market cap hits $18.4B · +3.2%",    asset:"",                 val:0,      color:"#14F195", time:88  },
  { type:"borrow",  user:"HeFq…wZq5", msg:"borrowed 7,150 USDC against",           asset:"Rolex Submariner", val:7150,   color:"#14F195", time:112 },
  { type:"battle",  user:"8bBx…pf58", msg:"deployed Charizard 1999 and won",       asset:"1999 Charizard",   val:550,    color:"#FF6B35", time:134 },
  { type:"stake",   user:"CmWV…tdDk", msg:"staked 5,000 $ABRA at 25% APY",        asset:"",                 val:5000,   color:"#C8A96E", time:156 },
  { type:"market",  user:"",          msg:"Solana RWA TVL crosses $2.2B · +41% YTD",  asset:"",              val:0,      color:"#9945FF", time:189 },
  { type:"pull",    user:"7xA3…mK9f", msg:"pulled Rare Holo",                      asset:"Blanton's 1990",   val:550,    color:"#6b8cff", time:201 },
  { type:"battle",  user:"Db6R…xQ2p", msg:"entered Prize Pool with",               asset:"Flightline 2019",  val:180000, color:"#22c55e", time:224 },
  { type:"market",  user:"",          msg:"Gold hits $4,733/oz · +0.4%",           asset:"",                 val:0,      color:"#D4AF37", time:247 },
];
const TYPE_LABELS: Record<string,string> = { pull:"GACHA", borrow:"BORROW", battle:"ARENA", stake:"VAULT", market:"MARKET" };
const TYPE_COLORS: Record<string,string> = { pull:"#FBBF24", borrow:"#14F195", battle:"#a855f7", stake:"#C8A96E", market:"#9945FF" };

function LiveActivityFeed() {
  const [visible, setVisible] = useState(FEED_EVENTS.slice(0,6));
  const [tick,    setTick]    = useState(0);
  const [paused,  setPaused]  = useState(false);

  useEffect(()=>{
    if(paused) return;
    const iv=setInterval(()=>{
      setTick(t=>{
        const next=(t+1)%FEED_EVENTS.length;
        setVisible(prev=>[FEED_EVENTS[next],...prev.slice(0,5)]);
        return next;
      });
    },3200);
    return ()=>clearInterval(iv);
  },[paused]);

  return (
    <div style={{ marginBottom:"1.5rem" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.5rem" }}>
        <div style={{ display:"flex",alignItems:"center",gap:"0.4rem" }}>
          <div style={{ width:"6px",height:"6px",borderRadius:"50%",background:"#14F195",animation:"pulse 1.5s ease-in-out infinite",boxShadow:"0 0 6px rgba(20,241,149,0.8)" }} />
          <span style={{ fontSize:"0.48rem",fontWeight:700,color:"rgba(255,255,255,0.45)",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace" }}>Live Activity</span>
        </div>
        <button onClick={()=>setPaused(p=>!p)} style={{ fontSize:"0.42rem",color:"rgba(255,255,255,0.22)",background:"none",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"3px",padding:"0.1rem 0.35rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>
          {paused?"RESUME":"PAUSE"}
        </button>
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:"0.2rem",overflow:"hidden" }}>
        {visible.map((ev,i)=>{
          const tcolor = TYPE_COLORS[ev.type]??"#6b8cff";
          const tlabel = TYPE_LABELS[ev.type]??"EVENT";
          return (
            <div key={`${ev.user}-${ev.time}-${i}`} style={{ display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.3rem 0.5rem",borderRadius:"6px",background:i===0?"rgba(255,255,255,0.025)":"rgba(255,255,255,0.01)",border:`1px solid ${i===0?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.02)"}`,transition:"all 0.3s",opacity:Math.max(0.3,1-i*0.12) }}>
              <span style={{ fontSize:"0.38rem",fontWeight:800,padding:"0.06rem 0.3rem",borderRadius:"3px",background:`${tcolor}14`,color:tcolor,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.1em",flexShrink:0,border:`1px solid ${tcolor}25` }}>{tlabel}</span>
              {ev.user&&<span style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.45)",fontFamily:"'JetBrains Mono',monospace",flexShrink:0 }}>{ev.user}</span>}
              <span style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.6)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                {ev.msg}{ev.asset?<strong style={{ color:"#f0f0f0",marginLeft:"0.2rem" }}>{ev.asset}</strong>:null}
              </span>
              {ev.val>0&&<span style={{ marginLeft:"auto",fontSize:"0.44rem",color:ev.color,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",flexShrink:0,fontVariantNumeric:"tabular-nums" }}>
                {ev.type==="borrow"?`$${ev.val.toLocaleString()}`:ev.type==="stake"?`${ev.val.toLocaleString()}$A`:ev.type==="pull"?`${fmtUsd(ev.val)}`:`+${ev.val}$A`}
              </span>}
              <span style={{ fontSize:"0.4rem",color:"rgba(255,255,255,0.15)",fontFamily:"'JetBrains Mono',monospace",flexShrink:0 }}>{ev.time}s ago</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, sub, color }:{ icon:string; title:string; sub:string; color:string }) {
  return (
    <div style={{ display:"flex",alignItems:"baseline",gap:"0.5rem",marginBottom:"0.625rem",borderBottom:`1px solid ${color}18`,paddingBottom:"0.4rem" }}>
      <span style={{ fontSize:"0.7rem",color:color }}>{icon}</span>
      <span style={{ fontWeight:800,fontSize:"0.82rem",color:"#f0f0f0" }}>{title}</span>
      <span style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>{sub}</span>
    </div>
  );
}

// ─── Tokenize CTA ─────────────────────────────────────────────────────────────
function TokenizeCTA() {
  return (
    <div style={{ marginBottom:"1.5rem",padding:"0.875rem 1rem",background:"rgba(107,140,255,0.05)",border:"1px solid rgba(107,140,255,0.14)",borderRadius:"12px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.625rem" }}>
      <div>
        <div style={{ fontWeight:800,fontSize:"0.82rem",color:"#f0f0f0",marginBottom:"3px" }}>Tokenize Your Assets</div>
        <div style={{ fontSize:"0.54rem",color:"rgba(255,255,255,0.38)",fontFamily:"'JetBrains Mono',monospace" }}>
          Spirits · Watches · Comics · Collectibles · Metals — own it on Solana
        </div>
      </div>
      <a href="/tokenize" style={{ padding:"0.4rem 0.875rem",borderRadius:"7px",background:"rgba(107,140,255,0.14)",border:"1px solid rgba(107,140,255,0.3)",color:"#6b8cff",fontSize:"0.65rem",fontWeight:700,textDecoration:"none",fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap" }}>
        Start Tokenizing →
      </a>
    </div>
  );
}

// ─── Stock panel ──────────────────────────────────────────────────────────────
function StockPanel({ assets }:{ assets:ArenaAsset[] }) {
  const stocks=assets.filter(a=>a.category==="Stocks");
  if(!stocks.length) return null;
  return (
    <div style={{ marginBottom:"1.5rem" }}>
      <SectionHeader icon="◈" title="Tokenized Equity" sub="NASDAQ on-chain · 70% LTV" color="#14F195" />
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"0.4rem" }}>
        {stocks.map(s=>(
          <div key={s.id} style={{ padding:"0.5rem 0.625rem",background:"rgba(6,8,16,0.97)",border:"1px solid rgba(20,241,149,0.1)",borderRadius:"7px" }}>
            <div style={{ fontWeight:800,fontSize:"0.72rem",color:"#14F195",fontFamily:"'JetBrains Mono',monospace" }}>{s.ticker}</div>
            <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.3)",marginBottom:"0.2rem" }}>{s.name.split("(")[0].trim()}</div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline" }}>
              <span style={{ fontWeight:800,fontSize:"0.8rem",fontVariantNumeric:"tabular-nums",fontFamily:"'JetBrains Mono',monospace" }}>${s.priceUsd.toFixed(2)}</span>
              <span style={{ fontSize:"0.52rem",fontWeight:700,color:s.change24h>=0?"#14F195":"#f26b6b",fontVariantNumeric:"tabular-nums" }}>
                {s.change24h>=0?"+":""}{s.change24h.toFixed(2)}%
              </span>
            </div>
            {s.can_borrow&&s.ltv&&<div style={{ fontSize:"0.42rem",color:"rgba(20,241,149,0.5)",fontFamily:"'JetBrains Mono',monospace",marginTop:"2px" }}>{Math.round(s.ltv*100)}% LTV</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Metals strip ─────────────────────────────────────────────────────────────
function MetalsStrip({ assets }:{ assets:ArenaAsset[] }) {
  const metals=assets.filter(a=>a.category==="Metals");
  if(!metals.length) return null;
  return (
    <div style={{ marginBottom:"1.5rem",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"0.5rem" }}>
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
  const color=cell.owner==="player"?"#14F195":cell.owner==="agent"?"#f26b6b":"transparent";
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
            {/* Stats visible inside board only */}
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

// ─── Sovereign Arena engine ───────────────────────────────────────────────────
function SovereignArena({ assets, arenaRef }:{ assets:ArenaAsset[]; arenaRef:React.RefObject<HTMLDivElement> }) {
  const [filter,      setFilter]      = useState("all");
  const [cols,        setCols]        = useState(3);
  const [sel3,        setSel3]        = useState<string[]>([]);
  const [agent,       setAgent]       = useState<typeof AGENTS[number]>(AGENTS[0]);
  const [wager,       setWager]       = useState(0.5);
  const [wTok,        setWTok]        = useState<"SOL"|"USDC"|"ABX">("SOL");
  const [pink,        setPink]        = useState(false);
  const [match,       setMatch]       = useState<MatchState|null>(null);
  const [elo,         setElo]         = useState<EloState>(()=>loadElo());
  const [quests,      setQuests]      = useState(DAILY_QUESTS.map(q=>({...q})));
  const [brokerOpen,  setBrokerOpen]  = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Feed order: Spirits first, then Watches, then everything else
  const sortedAssets = [...assets].sort((a,b)=>{
    const order: Record<string,number> = { Watches:0, Comics:1, Spirits:2, Metals:3, Stocks:4, Racehorses:5, Sports:6, Pokemon:7, "One Piece":8 };
    return (order[a.category]??9) - (order[b.category]??9);
  });

  const cats = ["all","Watches","Comics","Spirits","Metals","Stocks","Racehorses","Sports","Pokemon","One Piece"];
  const shown = filter==="all"
    ? sortedAssets
    : sortedAssets.filter(a=>a.category===filter);

  useEffect(()=>{ if(logRef.current) logRef.current.scrollTop=logRef.current.scrollHeight; },[match?.log]);

  function toggleSel(id:string) {
    if(match) return;
    setSel3(p=>p.includes(id)?p.filter(x=>x!==id):p.length>=3?p:[...p,id]);
  }

  function launchMatch() {
    if(sel3.length!==3) return;
    const playerHand=sel3.map(id=>enrichTT(assets.find(a=>a.id===id)!));
    const remaining=assets.filter(a=>!sel3.includes(a.id));
    const agentHand=remaining.sort((a,b)=>(b.attributes?.power_level??0)-(a.attributes?.power_level??0)).slice(0,3).map(enrichTT);
    setMatch({
      phase:"treasury",board:Array(9).fill(null).map(()=>({asset:null,owner:null})),
      playerHand,agentHand,turn:"player",liquidity:6,maxLiquidity:6,
      macroEvent:null,activeAgent:agent,wager,wagerToken:wTok,pinkSlips:pink,
      log:[`[x402] Ante: ${wager} ${wTok} deducted`,`[PHASE 1] Treasury Setup — 6 LIQ allocated`,`[AGENT] ${agent.name} — ${agent.buff}`,`[SQUAD] ${playerHand.map(a=>a.archetype).join(", ")}`],
      winner:null,abraEarned:0,prestige:0,
    });
    // Quest: spirits
    if(playerHand.some(a=>a.category==="Spirits")) setQuests(qs=>qs.map(q=>q.id==="spirits"?{...q,progress:Math.min(q.goal,q.progress+1)}:q));
  }

  async function advancePhase() {
    if(!match||match.phase==="done") return;
    if(match.phase==="treasury") {
      setMatch(m=>m?{...m,phase:"deploy",log:[...m.log,"[PHASE 2] Deploy your assets"]}:m);
    } else if(match.phase==="macro") {
      const macroEv=match.macroEvent;
      const log=[...match.log,"[PHASE 4] Agent Reactions"];
      const matchTactic=(match.activeAgent.tactic as string);
      if(macroEv && matchTactic==="hedge") log.push(`[${match.activeAgent.name}] Hedge triggered — defending against ${macroEv.name}`);
      if(macroEv && matchTactic==="yield") log.push(`[${match.activeAgent.name}] Yield maximized under ${macroEv.name}`);
      setMatch(m=>m?{...m,phase:"agents",log}:m);
    } else if(match.phase==="agents") {
      const ps=scoreBoard(match.board,"player"); const as=scoreBoard(match.board,"agent");
      const winner:"player"|"agent"|"draw"=ps>as?"player":as>ps?"agent":"draw";
      const abra=winner==="player"?Math.round(match.playerHand.length*60+(match.pinkSlips?120:0)):0;
      const pres=winner==="player"?Math.round(match.wager*100):0;
      const eloChange=calcEloChange(elo.rating,1050,winner==="player");
      const newElo:EloState={ rating:Math.max(0,elo.rating+eloChange), rank:getRank(Math.max(0,elo.rating+eloChange)), wins:elo.wins+(winner==="player"?1:0), losses:elo.losses+(winner!=="player"?1:0), streak:winner==="player"?elo.streak+1:0, prestige:elo.prestige+pres, abraEarned:elo.abraEarned+abra };
      setElo(newElo); saveElo(newElo);
      setQuests(qs=>qs.map(q=>{
        if(q.id==="win3"&&winner==="player") return{...q,progress:Math.min(q.goal,q.progress+1)};
        if(q.id==="streak"&&newElo.streak>=2) return{...q,progress:Math.min(q.goal,2)};
        return q;
      }));
      setMatch(m=>m?{...m,phase:"done",winner,abraEarned:abra,prestige:pres,
        log:[...m.log,`[PHASE 5] Settlement — Player: ${ps} | Sophia: ${as}`,winner==="player"?`[VICTORY] +${abra} $ABRA, +${pres} prestige`:`[DEFEATED] Sophia holds`]}:m);
    }
  }

  async function placeCard(cellIdx:number) {
    if(!match||match.turn!=="player"||match.board[cellIdx].asset||!match.playerHand.length) return;
    const liqCost=ARCH_CFG[match.playerHand[0].archetype??"Aggro"]?.liqCost??2;
    if(match.liquidity<liqCost) return;
    const card=match.playerHand[0];
    const b2=applyFlips(match.board.map((c,i)=>i===cellIdx?{asset:card,owner:"player" as Owner}:c),cellIdx,"player");
    const h2=match.playerHand.slice(1); const log2=[...match.log,`[DEPLOY] ${card.name} [${card.archetype}] — ${liqCost} LIQ`];
    const liq2=match.liquidity-liqCost;
    const allFilled=b2.every(c=>!!c.asset)&&!h2.length&&!match.agentHand.length;
    if(allFilled){ const ps=scoreBoard(b2,"player");const as=scoreBoard(b2,"agent"); const w:"player"|"agent"|"draw"=ps>as?"player":as>ps?"agent":"draw"; const ab=w==="player"?Math.round(h2.length*60+(match.pinkSlips?120:0)):0;
      setMatch(m=>m?{...m,board:b2,playerHand:h2,liquidity:liq2,phase:"done",winner:w,abraEarned:ab,prestige:w==="player"?Math.round(match.wager*100):0,log:[...log2,`[SETTLE] You: ${ps} | Sophia: ${as} — ${w.toUpperCase()}`]}:m); return; }
    setMatch(m=>m?{...m,board:b2,playerHand:h2,liquidity:liq2,turn:"agent",log:log2}:m);
    setTimeout(()=>{
      setMatch(prev=>{
        if(!prev||prev.turn!=="agent"||!prev.agentHand.length) return prev;
        const ac=prev.agentHand[0]; const ei=prev.board.findIndex(c=>!c.asset); if(ei===-1) return prev;
        const b3=applyFlips(prev.board.map((c,i)=>i===ei?{asset:ac,owner:"agent" as Owner}:c),ei,"agent");
        const h3=prev.agentHand.slice(1); const log3=[...prev.log,`[SOPHIA] ${ac.name} [${ac.archetype}] at [${ei}]`];
        const liq3=Math.min(prev.maxLiquidity,prev.liquidity+2);
        const filled=b3.filter(c=>!!c.asset).length;
        if(filled>=4&&!prev.macroEvent){ const ev=MACRO_EVENTS[Math.floor(Math.abs(Math.sin(Date.now()))*MACRO_EVENTS.length)]; return{...prev,board:b3,agentHand:h3,liquidity:liq3,turn:"player",phase:"macro",macroEvent:ev,log:[...log3,`[MACRO] ${ev.name} — ${ev.desc}`]}; }
        const done2=b3.every(c=>!!c.asset)||(!prev.playerHand.length&&!h3.length);
        if(done2){ const ps=scoreBoard(b3,"player");const as=scoreBoard(b3,"agent"); const w2:"player"|"agent"|"draw"=ps>as?"player":as>ps?"agent":"draw"; const ab2=w2==="player"?Math.round(prev.playerHand.length*60+(prev.pinkSlips?120:0)):0;
          return{...prev,board:b3,agentHand:h3,liquidity:liq3,turn:"player",phase:"done",winner:w2,abraEarned:ab2,prestige:w2==="player"?Math.round(prev.wager*100):0,log:[...log3,`[SETTLE] You: ${ps} | Sophia: ${as} — ${w2.toUpperCase()}`]}; }
        return{...prev,board:b3,agentHand:h3,liquidity:liq3,turn:"player",log:log3};
      });
    },900);
  }

  return (
    <div ref={arenaRef}>
      {/* Arena header */}
      <div style={{ marginBottom:"0.875rem" }}>
        <SectionHeader icon="⚔" title="Sovereign Asset Combat" sub="5-phase · macro events · liquidity engine · ELO ranked" color="#D4AF37" />
      </div>

      {/* ELO + quests + broker */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:"0.5rem",marginBottom:"0.875rem" }}>
        <div style={{ padding:"0.625rem 0.75rem",background:"rgba(6,8,16,0.97)",border:`1px solid ${RANK_COLORS[elo.rank]}30`,borderRadius:"10px" }}>
          <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.25)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.25rem" }}>Sovereign Rank</div>
          <div style={{ fontWeight:900,fontSize:"0.88rem",color:RANK_COLORS[elo.rank],marginBottom:"0.3rem" }}>{elo.rank} · {elo.rating}</div>
          <div style={{ display:"flex",gap:"0.75rem" }}>
            {[["W",elo.wins],["L",elo.losses],["STK",elo.streak]].map(([l,v])=>(
              <div key={l}><div style={{ fontSize:"0.4rem",color:"rgba(255,255,255,0.22)",fontFamily:"'JetBrains Mono',monospace" }}>{l}</div><div style={{ fontSize:"0.6rem",fontWeight:700,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace" }}>{v}</div></div>
            ))}
          </div>
        </div>
        <div style={{ padding:"0.625rem 0.75rem",background:"rgba(6,8,16,0.97)",border:"1px solid rgba(168,85,247,0.15)",borderRadius:"10px" }}>
          <div style={{ fontSize:"0.44rem",color:"rgba(168,85,247,0.7)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.35rem" }}>Daily Quests</div>
          {quests.map(q=>(
            <div key={q.id} style={{ display:"flex",alignItems:"center",gap:"0.3rem",marginBottom:"0.2rem" }}>
              <div style={{ width:"5px",height:"5px",borderRadius:"50%",background:q.progress>=q.goal?"#a855f7":"rgba(255,255,255,0.15)",flexShrink:0 }} />
              <span style={{ flex:1,fontSize:"0.46rem",color:q.progress>=q.goal?"#a855f7":"rgba(255,255,255,0.45)",fontFamily:"'JetBrains Mono',monospace" }}>{q.label}</span>
              <span style={{ fontSize:"0.44rem",color:"#a855f7",fontFamily:"'JetBrains Mono',monospace" }}>+{q.reward}</span>
            </div>
          ))}
        </div>
        <div style={{ padding:"0.625rem 0.75rem",background:"rgba(20,241,149,0.04)",border:"1px solid rgba(20,241,149,0.14)",borderRadius:"10px" }}>
          <div style={{ fontSize:"0.5rem",fontWeight:700,color:"#14F195",marginBottom:"3px" }}>Broker Connect</div>
          <div style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.32)",lineHeight:1.5,marginBottom:"0.4rem" }}>Tokenize stocks → borrow USDC via Loopscale</div>
          <button onClick={()=>setBrokerOpen(b=>!b)} style={{ padding:"0.25rem 0.5rem",borderRadius:"5px",background:"rgba(20,241,149,0.1)",border:"1px solid rgba(20,241,149,0.25)",color:"#14F195",fontSize:"0.52rem",fontWeight:700,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>
            {brokerOpen?"Close":"Connect Broker →"}
          </button>
        </div>
      </div>

      {/* Broker panel */}
      {brokerOpen&&(
        <div style={{ padding:"0.875rem 1rem",background:"rgba(6,8,16,0.97)",border:"1px solid rgba(20,241,149,0.2)",borderRadius:"12px",marginBottom:"1rem" }}>
          <div style={{ fontWeight:700,fontSize:"0.72rem",color:"#14F195",marginBottom:"0.5rem" }}>Connect Broker → Tokenize → Borrow USDC</div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:"0.4rem",marginBottom:"0.5rem" }}>
            {[{s:"1",l:"Connect Broker",d:"Alpaca, Schwab, or FIX-compatible",c:"#14F195"},{s:"2",l:"Tokenize",d:"NVDA/AAPL/TSLA → Token-2022",c:"#6b8cff"},{s:"3",l:"Instant Credit",d:`Up to $${getLoopscaleLiquidity(211.48,"Stocks").borrowLimit} USDC at 5.2% APR`,c:"#C8A96E"}].map(i=>(
              <div key={i.s} style={{ padding:"0.5rem 0.625rem",background:"rgba(255,255,255,0.03)",border:`1px solid ${i.c}20`,borderRadius:"7px" }}>
                <div style={{ fontWeight:700,fontSize:"0.54rem",color:"#f0f0f0",marginBottom:"2px" }}>{i.s}. {i.l}</div>
                <div style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.38)",lineHeight:1.5 }}>{i.d}</div>
              </div>
            ))}
          </div>
          <a href="/tokenize" style={{ display:"inline-flex",alignItems:"center",gap:"0.3rem",padding:"0.4rem 0.875rem",borderRadius:"7px",background:"linear-gradient(135deg,#14F195,#6b8cff)",color:"#000",fontSize:"0.62rem",fontWeight:800,textDecoration:"none",fontFamily:"'JetBrains Mono',monospace" }}>Start Tokenizing →</a>
        </div>
      )}

      {/* Category filter — big neon pills */}
      <div style={{ display:"flex",gap:"0.4rem",marginBottom:"1rem",flexWrap:"wrap" }}>
        {cats.filter(c=>c==="all"||assets.some(a=>a.category===c)).map(cat=>{
          const c = cat==="all"?"#f0f0f0":(CAT_COLOR[cat]??"#6b8cff");
          const active = filter===cat;
          return (
            <button key={cat} onClick={()=>setFilter(cat)} style={{
              padding:"0.4rem 0.875rem",borderRadius:"20px",
              fontSize:"0.62rem",fontWeight:active?800:500,
              border:`1px solid ${active?c:c+"22"}`,
              background:active?`${c}15`:"rgba(255,255,255,0.02)",
              color:active?c:c+"55",
              cursor:"pointer",
              letterSpacing:"0.04em",
              fontFamily:"'JetBrains Mono',monospace",
              boxShadow:active?`0 0 12px ${c}25,inset 0 0 12px ${c}08`:"none",
              transition:"all 0.15s",
              textTransform:"uppercase",
            }}
            onMouseEnter={e=>{if(!active){(e.currentTarget as HTMLElement).style.borderColor=c+"44";(e.currentTarget as HTMLElement).style.color=c+"88";}}}
            onMouseLeave={e=>{if(!active){(e.currentTarget as HTMLElement).style.borderColor=c+"22";(e.currentTarget as HTMLElement).style.color=c+"55";}}}>
              {cat==="all"?"All":cat}
            </button>
          );
        })}
      </div>

      {/* Pre-match setup */}
      {!match&&(
        <div style={{ padding:"0.875rem 1rem",background:"rgba(6,8,16,0.97)",border:"1px solid rgba(212,175,55,0.2)",borderRadius:"12px",marginBottom:"1rem" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"0.75rem" }}>
            <div>
              <div style={{ fontSize:"0.58rem",fontWeight:700,color:"#f0f0f0",marginBottom:"3px" }}>
                {sel3.length===0?"Select 3 assets to deploy":sel3.length<3?`${sel3.length}/3 — pick ${3-sel3.length} more`:"Squad ready"}
              </div>
              {sel3.length===3&&<div style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.35)",fontFamily:"'JetBrains Mono',monospace" }}>
                Archetypes: {sel3.map(id=>assets.find(a=>a.id===id)?.archetype).join(" · ")}
              </div>}
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:"0.45rem",minWidth:"220px" }}>
              <div style={{ display:"flex",gap:"0.2rem",flexWrap:"wrap" }}>
                {AGENTS.map(a=>(
                  <button key={a.id} onClick={()=>setAgent(a)} style={{ padding:"0.18rem 0.4rem",borderRadius:"4px",fontSize:"0.46rem",fontWeight:agent.id===a.id?700:400,border:`1px solid ${agent.id===a.id?a.color+"44":"rgba(255,255,255,0.07)"}`,background:agent.id===a.id?`${a.color}14`:"transparent",color:agent.id===a.id?a.color:"rgba(255,255,255,0.36)",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>{a.name}</button>
                ))}
              </div>
              <div style={{ display:"flex",gap:"0.2rem",alignItems:"center",flexWrap:"wrap" }}>
                <div style={{ display:"flex",alignItems:"center",gap:"0.22rem",padding:"0.18rem 0.4rem",borderRadius:"4px",background:"rgba(96,165,250,0.07)",border:"1px solid rgba(96,165,250,0.18)" }}>
                  <span style={{ width:"4px",height:"4px",borderRadius:"50%",background:"#60A5FA" }} />
                  <span style={{ fontSize:"0.44rem",color:"#60A5FA",fontFamily:"'JetBrains Mono',monospace",fontWeight:700 }}>x402 {wager} {wTok}</span>
                </div>
                {(["SOL","USDC","ABX"] as const).map(t=>(
                  <button key={t} onClick={()=>setWTok(t)} style={{ padding:"0.15rem 0.35rem",borderRadius:"3px",fontSize:"0.44rem",fontWeight:wTok===t?700:400,border:`1px solid ${wTok===t?"rgba(255,255,255,0.28)":"rgba(255,255,255,0.07)"}`,background:wTok===t?"rgba(255,255,255,0.07)":"transparent",color:wTok===t?"#f0f0f0":"rgba(255,255,255,0.28)",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>{t}</button>
                ))}
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:"0.4rem" }}>
                <button onClick={()=>setPink(p=>!p)} style={{ width:"26px",height:"14px",borderRadius:"100px",border:"none",cursor:"pointer",background:pink?"#f26b6b":"rgba(255,255,255,0.08)",position:"relative",flexShrink:0,transition:"background 0.2s" }}>
                  <span style={{ position:"absolute",top:"1px",left:pink?"12px":"1px",width:"12px",height:"12px",borderRadius:"50%",background:"#fff",transition:"left 0.2s",display:"block" }} />
                </button>
                <span style={{ fontSize:"0.48rem",color:pink?"#f26b6b":"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>Pink Slips {pink?"ON":"OFF"}</span>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:"0.25rem" }}>
                <button onClick={launchMatch} disabled={sel3.length!==3} style={{ padding:"0.55rem 1rem",borderRadius:"8px",border:"none",fontWeight:900,fontSize:"0.72rem",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em",cursor:sel3.length===3?"pointer":"not-allowed",background:sel3.length===3?"linear-gradient(135deg,#a855f7,#6b8cff)":"rgba(255,255,255,0.04)",color:sel3.length===3?"#fff":"rgba(255,255,255,0.15)",boxShadow:sel3.length===3?"0 0 24px rgba(168,85,247,0.4)":"none",transition:"all 0.2s",whiteSpace:"nowrap" }}>
                  {sel3.length===3?"Enter Arena — Battle Now →":`Select ${3-sel3.length} more asset${3-sel3.length!==1?"s":""}…`}
                </button>
                {sel3.length===0&&<span style={{ fontSize:"0.42rem",color:"rgba(251,191,36,0.5)",fontFamily:"'JetBrains Mono',monospace",textAlign:"center" }}>First time? Pick 3 cards then hit Enter Arena</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active match */}
      {match&&(
        <div style={{ marginBottom:"1rem" }}>
          <div style={{ display:"flex",gap:"0.22rem",marginBottom:"0.5rem",flexWrap:"wrap" }}>
            {["treasury","deploy","macro","agents","settle"].map((ph,i)=>{
              const phases=["treasury","deploy","macro","agents","settle","done"];
              const cur=phases.indexOf(match.phase); const isA=ph===match.phase||(ph==="settle"&&match.phase==="done"); const isDone=phases.indexOf(ph)<cur;
              return(<div key={ph} style={{ padding:"0.2rem 0.5rem",borderRadius:"4px",fontSize:"0.46rem",fontWeight:isA?700:400,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.06em",background:isA?"rgba(212,175,55,0.12)":isDone?"rgba(20,241,149,0.07)":"rgba(255,255,255,0.03)",color:isA?"#D4AF37":isDone?"#14F195":"rgba(255,255,255,0.22)",border:`1px solid ${isA?"rgba(212,175,55,0.3)":isDone?"rgba(20,241,149,0.15)":"rgba(255,255,255,0.05)"}` }}>{i+1}. {ph}</div>);
            })}
            <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:"0.35rem" }}>
              {Array.from({length:match.maxLiquidity}).map((_,i)=>(
                <div key={i} style={{ width:"7px",height:"10px",borderRadius:"1px",background:i<match.liquidity?"#FBBF24":"rgba(255,255,255,0.07)" }} />
              ))}
            </div>
          </div>

          {match.macroEvent&&(
            <div style={{ padding:"0.5rem 0.75rem",background:`${match.macroEvent.color}0c`,border:`1px solid ${match.macroEvent.color}30`,borderRadius:"8px",marginBottom:"0.5rem",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"0.5rem",flexWrap:"wrap" }}>
              <div>
                <span style={{ fontSize:"0.52rem",fontWeight:700,color:match.macroEvent.color,fontFamily:"'JetBrains Mono',monospace" }}>[MACRO] {match.macroEvent.name}</span>
                <span style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.38)",marginLeft:"0.5rem" }}>{match.macroEvent.desc}</span>
              </div>
              {match.phase==="macro"&&<button onClick={advancePhase} style={{ padding:"0.25rem 0.625rem",borderRadius:"5px",background:`${match.macroEvent.color}14`,border:`1px solid ${match.macroEvent.color}33`,color:match.macroEvent.color,fontSize:"0.52rem",fontWeight:700,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>Resolve</button>}
            </div>
          )}

          {match.phase!=="done"?(
            <div style={{ display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:"0.75rem",alignItems:"start" }}>
              <div>
                <div style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.25rem" }}>YOUR HAND ({match.playerHand.length})</div>
                {match.playerHand.map(a=>{
                  const cost=ARCH_CFG[a.archetype??"Aggro"]?.liqCost??2; const canAfford=match.liquidity>=cost;
                  return(<div key={a.id} style={{ padding:"0.28rem 0.4rem",background:"rgba(20,241,149,0.06)",border:`1px solid ${canAfford?"rgba(20,241,149,0.18)":"rgba(255,255,255,0.06)"}`,borderRadius:"5px",marginBottom:"0.2rem" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                      <span style={{ fontSize:"0.5rem",color:canAfford?"#14F195":"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"120px" }}>{a.name}</span>
                      <span style={{ fontSize:"0.44rem",color:"#FBBF24",fontFamily:"'JetBrains Mono',monospace",flexShrink:0 }}>{cost} LIQ</span>
                    </div>
                  </div>);
                })}
              </div>
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
              <div>
                <div style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.25rem",textAlign:"right" }}>SOPHIA ({match.agentHand.length})</div>
                {match.agentHand.map(a=>(
                  <div key={a.id} style={{ padding:"0.28rem 0.4rem",background:"rgba(242,107,107,0.06)",border:"1px solid rgba(242,107,107,0.18)",borderRadius:"5px",marginBottom:"0.2rem",textAlign:"right" }}>
                    <span style={{ fontSize:"0.5rem",color:"#f26b6b",fontFamily:"'JetBrains Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block" }}>{a.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ):(
            <div style={{ padding:"1.25rem",background:"rgba(6,8,16,0.97)",border:`1px solid ${match.winner==="player"?"rgba(20,241,149,0.3)":match.winner==="draw"?"rgba(251,191,36,0.3)":"rgba(242,107,107,0.3)"}`,borderRadius:"12px",textAlign:"center" }}>
              <div style={{ fontWeight:900,fontSize:"1.4rem",color:match.winner==="player"?"#14F195":match.winner==="draw"?"#FBBF24":"#f26b6b",letterSpacing:"-0.02em",marginBottom:"0.4rem" }}>
                {match.winner==="player"?"VICTORY":match.winner==="draw"?"DRAW":"DEFEATED"}
              </div>
              {match.abraEarned>0&&<div style={{ fontSize:"0.72rem",fontWeight:700,color:"#D4AF37",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.25rem" }}>+{match.abraEarned} $ABRA</div>}
              <div style={{ display:"flex",gap:"0.625rem",justifyContent:"center",marginBottom:"0.625rem" }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace" }}>ELO</div>
                  <div style={{ fontSize:"0.68rem",fontWeight:700,color:RANK_COLORS[elo.rank],fontFamily:"'JetBrains Mono',monospace" }}>{elo.rating} · {elo.rank}</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace" }}>Record</div>
                  <div style={{ fontSize:"0.68rem",fontWeight:700,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace" }}>{elo.wins}W {elo.losses}L</div>
                </div>
              </div>
              {match.pinkSlips&&match.winner==="player"&&<div style={{ fontSize:"0.52rem",color:"#f26b6b",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.5rem" }}>Pink Slips: RWA metadata transferred</div>}
              <button onClick={()=>{setMatch(null);setSel3([]);}} style={{ padding:"0.4rem 0.875rem",borderRadius:"7px",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.5)",fontSize:"0.62rem",fontFamily:"'JetBrains Mono',monospace",cursor:"pointer" }}>New Match</button>
            </div>
          )}

          {match.log.length>0&&(
            <div ref={logRef} style={{ marginTop:"0.625rem",background:"rgba(2,3,10,0.97)",border:"1px solid rgba(107,140,255,0.1)",borderRadius:"7px",padding:"0.4rem 0.625rem",maxHeight:"90px",overflowY:"auto",fontFamily:"'JetBrains Mono',monospace" }}>
              {match.log.slice(-8).map((l,i)=>(
                <p key={i} style={{ margin:"0 0 0.16rem",fontSize:"0.5rem",color:`rgba(96,165,250,${Math.max(0.2,0.9-i*0.08)})`,lineHeight:1.4 }}>{l}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Card grid — 2/3 col toggle */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.5rem" }}>
        <div style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.25)",fontFamily:"'JetBrains Mono',monospace" }}>
          {shown.length} assets · {filter==="all"?"All Categories":filter}
        </div>
        <div style={{ display:"flex",gap:"0.2rem" }}>
          <button onClick={()=>setCols(2)} style={{ padding:"0.18rem 0.4rem",borderRadius:"3px",border:`1px solid ${cols===2?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.07)"}`,background:cols===2?"rgba(255,255,255,0.07)":"transparent",color:cols===2?"#f0f0f0":"rgba(255,255,255,0.28)",fontSize:"0.48rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>⊟⊟</button>
          <button onClick={()=>setCols(3)} style={{ padding:"0.18rem 0.4rem",borderRadius:"3px",border:`1px solid ${cols===3?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.07)"}`,background:cols===3?"rgba(255,255,255,0.07)":"transparent",color:cols===3?"#f0f0f0":"rgba(255,255,255,0.28)",fontSize:"0.48rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>⊟⊟⊟</button>
        </div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:`repeat(${cols},minmax(0,1fr))`,gap:"0.6rem" }}>
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

      {/* Tokenize CTA — bottom of asset grid */}
      <div style={{ marginTop:"2rem",padding:"1.5rem",background:"linear-gradient(135deg,rgba(168,85,247,0.06),rgba(6,8,16,0.99))",border:"1px solid rgba(168,85,247,0.18)",borderRadius:"14px",textAlign:"center" }}>
        <p style={{ fontSize:"0.44rem",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(168,85,247,0.5)",fontFamily:"'JetBrains Mono',monospace",margin:"0 0 0.35rem" }}>Abraxas Protocol · Token-2022 · Solana</p>
        <h3 style={{ fontWeight:900,fontSize:"1.1rem",letterSpacing:"-0.02em",margin:"0 0 0.5rem",color:"#f0f0f0" }}>Tokenize Your Asset</h3>
        <p style={{ fontSize:"0.58rem",color:"rgba(255,255,255,0.38)",lineHeight:1.65,maxWidth:"420px",margin:"0 auto 1.25rem" }}>
          Convert a physical asset to a Token-2022 position on Solana in under 2 minutes. Vault it, borrow USDC, earn $ABRA, and battle in the Arena.
        </p>
        <a href="/tokenize" style={{ display:"inline-block",padding:"0.75rem 2rem",borderRadius:"10px",background:"linear-gradient(135deg,#a855f7,#6b8cff)",color:"#fff",fontWeight:900,fontSize:"0.82rem",fontFamily:"'JetBrains Mono',monospace",textDecoration:"none",letterSpacing:"0.04em",boxShadow:"0 0 28px rgba(168,85,247,0.3)",transition:"all 0.2s" }}>
          Start Tokenizing →
        </a>
        <div style={{ display:"flex",justifyContent:"center",gap:"1.5rem",marginTop:"1rem" }}>
          {[["Spirits","Baxus"],["Watches","Courtyard"],["Cards","Collector Crypt"],["Comics","Metropolis"]].map(([cat,src])=>(
            <div key={cat} style={{ textAlign:"center" }}>
              <div style={{ fontSize:"0.54rem",fontWeight:700,color:"rgba(255,255,255,0.5)" }}>{cat}</div>
              <div style={{ fontSize:"0.42rem",color:"rgba(255,255,255,0.25)",fontFamily:"'JetBrains Mono',monospace" }}>{src}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────
export function TerminalArenaSkeleton() {
  return (
    <div>
      <div style={{ height:"34px",background:"rgba(2,3,10,0.97)",animation:"pulse 1.5s ease-in-out infinite" }} />
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
  const [assets,  setAssets]  = useState<ArenaAsset[]>([]);
  const [ticks,   setTicks]   = useState<SoldTick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string|null>(null);
  const [mainTab, setMainTab] = useState("terminal");
  const arenaRef = useRef<HTMLDivElement>(null);

  // Listen for BottomNav tab dispatch events
  useEffect(()=>{
    function onTabEvent(e: Event) {
      const detail = (e as CustomEvent).detail as string;
      if(detail) setMainTab(detail);
    }
    window.addEventListener("abraxas-tab", onTabEvent);
    return ()=>window.removeEventListener("abraxas-tab", onTabEvent);
  },[]);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try {
        const res=await fetch("/api/cards"); const data=await res.json();
        if(!cancelled&&data.ok){ setAssets(data.assets); setTicks(buildSoldTape(data.assets)); }
      } catch { if(!cancelled) setError("Oracle unavailable"); }
      finally { if(!cancelled) setLoading(false); }
    })();
    return ()=>{ cancelled=true; };
  },[]);

  if(loading) return <TerminalArenaSkeleton />;

  return (
    <div>
      {/* Win Toast */}
      <div id="abra-win-toast" style={{ position:"fixed",top:"70px",left:"50%",transform:"translateX(-50%) translateY(-12px)",zIndex:9999,padding:"0.625rem 1.5rem",borderRadius:"10px",background:"linear-gradient(135deg,rgba(168,85,247,0.2),rgba(107,140,255,0.2))",border:"1px solid rgba(168,85,247,0.4)",color:"#f0f0f0",fontSize:"0.68rem",fontWeight:800,fontFamily:"'JetBrains Mono',monospace",opacity:0,transition:"opacity 0.3s,transform 0.3s",pointerEvents:"none",whiteSpace:"nowrap",backdropFilter:"blur(12px)",boxShadow:"0 0 30px rgba(168,85,247,0.3)" }}>
        Sovereign Victory · $ABRA earned · Auto-staking to vault
      </div>
      <style>{`
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
      `}</style>
      {error&&<div style={{ padding:"0.5rem 1rem",background:"rgba(242,107,107,0.07)",fontSize:"0.56rem",color:"#f26b6b",fontFamily:"'JetBrains Mono',monospace" }}>[ORACLE] {error}</div>}
      <SoldTape ticks={ticks} />
      <CommandBar onScrollToArena={()=>arenaRef.current?.scrollIntoView({behavior:"smooth"})} />
      {/* Main navigation tabs */}
      <div style={{ display:"flex", gap:"0.25rem", borderBottom:"1px solid rgba(255,255,255,0.06)", background:"rgba(2,3,10,0.96)", padding:"0.5rem 1.25rem", alignItems:"center" }}>
        {([
          ["terminal",   "Terminal",      "#f0f0f0",  "rgba(240,240,240,0.2)", "rgba(240,240,240,0.06)"],
          ["markets",    "Markets",       "#14F195",  "rgba(20,241,149,0.35)", "rgba(20,241,149,0.07)"],
          ["game_modes", "Game Modes",   "#FBBF24",  "rgba(251,191,36,0.4)",  "rgba(251,191,36,0.08)"],
        ] as const).map(([id,label,color,activeBorder,activeBg])=>(
          <button key={id} onClick={()=>setMainTab(id)} style={{ padding:"0.5rem 1rem", borderRadius:"7px", border:`1px solid ${mainTab===id?activeBorder:"rgba(255,255,255,0.06)"}`, background:mainTab===id?activeBg:"transparent", color:mainTab===id?color:"rgba(255,255,255,0.3)", fontSize:id==="game_modes"?"0.65rem":"0.62rem", fontWeight:mainTab===id?700:400, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.04em", transition:"all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>
      {mainTab==="terminal"&&(
        <div style={{ padding:"1.25rem" }}>
          {/* ──── SOVEREIGN HERO ──── */}
          {/* ═══════ HERO — Big & Premium ═══════ */}
          <div style={{ position:"relative",overflow:"hidden",borderRadius:"18px",padding:"2.5rem 2rem",marginBottom:"1.75rem",background:"linear-gradient(145deg,rgba(6,8,16,0.99) 0%,rgba(200,169,110,0.08) 40%,rgba(168,85,247,0.04) 70%,rgba(6,8,16,0.99) 100%)",border:"1px solid rgba(200,169,110,0.2)",boxShadow:"0 0 60px rgba(200,169,110,0.05)" }}>
            {/* Background orbs */}
            <div style={{ position:"absolute",top:"-30%",right:"-5%",width:"350px",height:"350px",borderRadius:"50%",background:"radial-gradient(circle,rgba(200,169,110,0.09) 0%,transparent 65%)",pointerEvents:"none" }} />
            <div style={{ position:"absolute",bottom:"-20%",left:"-5%",width:"250px",height:"250px",borderRadius:"50%",background:"radial-gradient(circle,rgba(168,85,247,0.06) 0%,transparent 65%)",pointerEvents:"none" }} />
            {/* Flywheel pill */}
            <div style={{ display:"inline-flex",alignItems:"center",gap:"0.5rem",padding:"0.25rem 0.75rem",borderRadius:"20px",background:"rgba(200,169,110,0.08)",border:"1px solid rgba(200,169,110,0.2)",marginBottom:"1rem" }}>
              <div style={{ width:"5px",height:"5px",borderRadius:"50%",background:"#C8A96E",animation:"pulse 2s ease-in-out infinite" }} />
              <span style={{ fontSize:"0.46rem",fontWeight:700,color:"rgba(200,169,110,0.7)",letterSpacing:"0.15em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace" }}>World Labs Protocol · Solana · May 2026</span>
            </div>
            {/* Main headline */}
            <h1 style={{ fontWeight:900,fontSize:"clamp(1.8rem,5vw,2.8rem)",letterSpacing:"-0.04em",margin:"0 0 0.75rem",lineHeight:1.05 }}>
              <span style={{ background:"linear-gradient(135deg,#C8A96E 0%,#FBBF24 40%,#f0f0f0 80%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>The OpenSea of RWAs</span>
            </h1>
            {/* Sub-headline */}
            <p style={{ fontSize:"0.72rem",color:"rgba(255,255,255,0.48)",margin:"0 0 0.4rem",maxWidth:"560px",lineHeight:1.65,fontWeight:400 }}>
              Tokenize physical assets on Solana. Borrow USDC instantly via Loopscale. Battle in the Sovereign Arena. Earn $ABRA.
            </p>
            <p style={{ fontSize:"0.58rem",color:"rgba(255,255,255,0.28)",margin:"0 0 1.5rem",maxWidth:"480px",lineHeight:1.65 }}>
              Spirits · Watches · Comics · Racehorses · Graded Cards · Precious Metals · Tokenized Equities
            </p>
            {/* CTAs */}
            <div style={{ display:"flex",gap:"0.625rem",flexWrap:"wrap",marginBottom:"1.75rem" }}>
              <a href="/tokenize" style={{ padding:"0.7rem 1.5rem",borderRadius:"9px",background:"linear-gradient(135deg,#C8A96E,#FBBF24)",color:"#000",fontWeight:900,fontSize:"0.7rem",fontFamily:"'JetBrains Mono',monospace",textDecoration:"none",letterSpacing:"0.04em",boxShadow:"0 0 20px rgba(212,175,55,0.3)" }}>Tokenize Asset</a>
              <a href="/protect" style={{ padding:"0.7rem 1.5rem",borderRadius:"9px",background:"rgba(20,241,149,0.09)",border:"1px solid rgba(20,241,149,0.25)",color:"#14F195",fontWeight:700,fontSize:"0.7rem",fontFamily:"'JetBrains Mono',monospace",textDecoration:"none" }}>Borrow USDC</a>
              <button onClick={()=>setMainTab("game_modes")} style={{ padding:"0.7rem 1.5rem",borderRadius:"9px",background:"rgba(168,85,247,0.09)",border:"1px solid rgba(168,85,247,0.28)",color:"#a855f7",fontWeight:700,fontSize:"0.7rem",fontFamily:"'JetBrains Mono',monospace",cursor:"pointer" }}>Play Games</button>
              <button onClick={()=>setMainTab("markets")} style={{ padding:"0.7rem 1.5rem",borderRadius:"9px",background:"rgba(20,241,149,0.05)",border:"1px solid rgba(20,241,149,0.15)",color:"rgba(20,241,149,0.7)",fontWeight:600,fontSize:"0.7rem",fontFamily:"'JetBrains Mono',monospace",cursor:"pointer" }}>Markets</button>
            </div>
            {/* Stats */}
            <div style={{ display:"flex",gap:"2rem",flexWrap:"wrap",paddingTop:"1.25rem",borderTop:"1px solid rgba(255,255,255,0.06)" }}>
              {[["102","RWA Assets"],["$20M+","Protocol Insured"],["5","Live Vault PDAs"],["5.2%","Fixed APR · Loopscale"]].map(([v,l])=>(
                <div key={l}>
                  <div style={{ fontSize:"1.1rem",fontWeight:900,color:"#C8A96E",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"-0.02em" }}>{v}</div>
                  <div style={{ fontSize:"0.42rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.1em",textTransform:"uppercase",marginTop:"1px" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          {/* ═══ HOW IT WORKS — Flywheel ═══ */}
          <div style={{ marginBottom:"1.5rem",padding:"1.25rem 1.5rem",background:"rgba(6,8,16,0.97)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"14px" }}>
            <p style={{ fontSize:"0.44rem",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(255,255,255,0.18)",fontFamily:"'JetBrains Mono',monospace",margin:"0 0 0.4rem" }}>Protocol Flywheel</p>
            <h3 style={{ fontWeight:800,fontSize:"0.88rem",color:"#f0f0f0",margin:"0 0 0.875rem",letterSpacing:"-0.01em" }}>How Abraxas Works — 4 Steps</h3>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,200px),1fr))",gap:"0.625rem" }}>
              {([
                { n:"01",label:"Tokenize",  color:"#a855f7", desc:"Convert any physical asset to a Token-2022 position on Solana in under 2 minutes. Spirits, watches, comics, cards, metals." },
                { n:"02",label:"Vault + Borrow", color:"#14F195",desc:"Deposit your token into an Abraxas vault. Borrow USDC instantly at 5.2% fixed APR via Loopscale Modular Vaults. LTV: 55–80%." },
                { n:"03",label:"Battle + Earn",  color:"#FBBF24",desc:"Deploy your assets in the Sovereign Arena. Win battles, pull gacha, hit Chase Markets. Earn $ABRA on every action." },
                { n:"04",label:"Compound",   color:"#C8A96E",desc:"$ABRA auto-stakes at 18–25% APY. Borrow against staked $ABRA at 50% LTV. Compound across every RWA class you hold." },
              ] as const).map(s=>(
                <div key={s.n} style={{ padding:"0.75rem",background:`${s.color}06`,border:`1px solid ${s.color}18`,borderRadius:"9px" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:"0.4rem",marginBottom:"0.35rem" }}>
                    <span style={{ fontSize:"0.4rem",fontWeight:900,color:s.color,fontFamily:"'JetBrains Mono',monospace",opacity:0.5 }}>{s.n}</span>
                    <span style={{ fontSize:"0.68rem",fontWeight:800,color:s.color,letterSpacing:"-0.01em" }}>{s.label}</span>
                  </div>
                  <p style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.42)",lineHeight:1.65,margin:0 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <StockPanel assets={assets} />
          <MetalsStrip assets={assets} />
          <LiveActivityFeed />
          <SovereignArena assets={assets} arenaRef={arenaRef as React.RefObject<HTMLDivElement>} />
        </div>
      )}
      {mainTab==="markets"&&(
        <div style={{ padding:"1.25rem" }}>
          {/* Markets header */}
          <div style={{ marginBottom:"1.25rem" }}>
            <p style={{ fontSize:"0.44rem",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(20,241,149,0.4)",fontFamily:"'JetBrains Mono',monospace",margin:"0 0 0.25rem" }}>Live Intelligence · May 2026</p>
            <h2 style={{ fontWeight:900,fontSize:"1.1rem",color:"#f0f0f0",margin:"0 0 0.35rem",letterSpacing:"-0.01em" }}>RWA Market Intelligence</h2>
            <p style={{ fontSize:"0.54rem",color:"rgba(255,255,255,0.35)",margin:0,lineHeight:1.65,maxWidth:"520px" }}>
              Real-world asset market data, news, and price charts. <strong style={{ color:"rgba(255,255,255,0.5)" }}>Green = price up, red = down.</strong> "RWA" means any physical asset tokenized on blockchain — from gold bars to graded Pokémon cards.
            </p>
          </div>
          <RWACharts />
        </div>
      )}
      {mainTab==="game_modes"&&(
        <div style={{ padding:"1.25rem" }}>
          <GameModesHub assets={assets} />
        </div>
      )}
    </div>
  );
}