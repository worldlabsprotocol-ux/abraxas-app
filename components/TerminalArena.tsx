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
  Sports:"#fb923c", Spirits:"#FF8C00",
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
function buildSoldTape(assets:ArenaAsset[]): SoldTick[] {
  return assets.filter(a=>a.last_sold_price>0)
    .map(a=>({ id:a.id, name:a.name, price:a.last_sold_price, category:a.category,
      source:a.last_sold_source??"Oracle",
      ts:Date.now()-Math.floor(Math.abs(Math.sin(a.id.length*9301))*7_200_000), ticker:a.ticker }))
    .sort((a,b)=>b.price-a.price).slice(0,20);
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

  if(!asset.imagePath||err) return (
    <div style={{ height,background:`linear-gradient(135deg,${catColor}12,rgba(6,8,16,0.98))`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"0.3rem",padding:"0.5rem" }}>
      <span style={{ fontSize:"0.5rem",fontWeight:700,color:catColor,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",textAlign:"center" }}>{asset.category}</span>
      <span style={{ fontSize:"0.68rem",fontWeight:800,color:"#f0f0f0",textAlign:"center",lineHeight:1.25,padding:"0 0.25rem" }}>{asset.name}</span>
      <span style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.38)",fontFamily:"'JetBrains Mono',monospace" }}>{asset.grade}</span>
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
  const imgH=compact?90:160;
  const catColor=CAT_COLOR[asset.category]??"#6b8cff";
  const archColor=asset.archetype_color??catColor;
  const borderColor=owner==="player"?"#14F195":owner==="agent"?"#f26b6b":selected?"#D4AF37":`${catColor}30`;
  const acquireUrl=getAcquireUrl(asset);
  const q = asset.can_borrow && asset.ltv ? getLoopscaleLiquidity(asset.priceUsd, asset.category) : null;

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
          <span style={{ fontSize:"0.38rem",fontWeight:700,color:"#D4AF37",letterSpacing:"0.08em",fontFamily:"'JetBrains Mono',monospace" }}>VAULT</span>
        </div>
      )}
      {owner&&<div style={{ position:"absolute",top:"0.3rem",left:"0.3rem",zIndex:4,width:"7px",height:"7px",borderRadius:"50%",background:owner==="player"?"#14F195":"#f26b6b" }} />}

      <AssetImage asset={asset} height={imgH} />

      <div style={{ padding:"0.45rem 0.5rem" }}>
        <div style={{ fontWeight:800,fontSize:"0.72rem",color:"#f0f0f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:"1px" }}>{asset.name}</div>

        {/* Category + archetype + buff — no ATK/DEF/SPD on card face */}
        <div style={{ display:"flex",alignItems:"center",gap:"0.25rem",marginBottom:"0.3rem",flexWrap:"wrap" }}>
          <span style={{ fontSize:"0.42rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>{asset.grade}</span>
          {asset.archetype&&(
            <span style={{ fontSize:"0.4rem",fontWeight:700,padding:"0.06rem 0.25rem",borderRadius:"3px",background:`${archColor}18`,border:`1px solid ${archColor}44`,color:archColor,fontFamily:"'JetBrains Mono',monospace" }}>
              {asset.archetype}
            </span>
          )}
          {asset.arena_buff&&(
            <span style={{ fontSize:"0.38rem",fontWeight:700,padding:"0.05rem 0.22rem",borderRadius:"3px",background:"rgba(168,85,247,0.12)",border:"1px solid rgba(168,85,247,0.3)",color:"#a855f7",fontFamily:"'JetBrains Mono',monospace" }}>
              {asset.arena_buff}
            </span>
          )}
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

            <a href={acquireUrl} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{ display:"block",padding:"0.3rem",borderRadius:"5px",fontSize:"0.52rem",fontWeight:700,background:"rgba(200,169,110,0.1)",border:"1px solid rgba(200,169,110,0.22)",color:"#C8A96E",textAlign:"center",textDecoration:"none",fontFamily:"'JetBrains Mono',monospace" }}>
              Acquire
            </a>
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
        <button onClick={onScrollToArena} style={{ padding:"0.3rem 0.75rem",borderRadius:"6px",background:"linear-gradient(135deg,rgba(212,175,55,0.2),rgba(255,107,53,0.15))",border:"1px solid rgba(212,175,55,0.35)",color:"#D4AF37",fontSize:"0.6rem",fontWeight:800,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em" }}>
          Deploy Squad
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
    const order: Record<string,number> = { Spirits:0, Watches:1, Comics:2, Metals:3, Stocks:4, Sports:5, Pokemon:6, "One Piece":7 };
    return (order[a.category]??9) - (order[b.category]??9);
  });

  const cats = ["all","Spirits","Watches","Comics","Metals","Stocks","Sports","Pokemon","One Piece"];
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

      {/* Category filter */}
      <div style={{ display:"flex",gap:"0.2rem",marginBottom:"0.875rem",flexWrap:"wrap" }}>
        {cats.filter(c=>c==="all"||assets.some(a=>a.category===c)).map(cat=>(
          <button key={cat} onClick={()=>setFilter(cat)} style={{ padding:"0.22rem 0.5rem",borderRadius:"4px",fontSize:"0.56rem",fontWeight:filter===cat?700:400,border:`1px solid ${filter===cat?(CAT_COLOR[cat]??"#6b8cff"):"rgba(255,255,255,0.07)"}`,background:filter===cat?`${CAT_COLOR[cat]??"#6b8cff"}12`:"transparent",color:filter===cat?(CAT_COLOR[cat]??"#6b8cff"):"rgba(255,255,255,0.36)",cursor:"pointer" }}>
            {cat==="all"?"All":cat}
          </button>
        ))}
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

      {/* Card grid — 2 wide default */}
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

      {/* Bottom deploy CTA */}
      <div style={{ marginTop:"2rem",padding:"1.25rem",background:"rgba(212,175,55,0.05)",border:"1px solid rgba(212,175,55,0.15)",borderRadius:"12px",textAlign:"center" }}>
        <p style={{ fontSize:"0.62rem",color:"rgba(255,255,255,0.4)",marginBottom:"0.75rem" }}>Ready to deploy autonomous defenses?</p>
        <button onClick={()=>window.scrollTo({top:arenaRef.current?.offsetTop??0,behavior:"smooth"})} style={{ padding:"0.6rem 1.5rem",borderRadius:"9px",border:"none",fontWeight:800,fontSize:"0.78rem",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em",background:"linear-gradient(135deg,#D4AF37,#FF6B35)",color:"#000",cursor:"pointer",boxShadow:"0 0 20px rgba(212,175,55,0.3)" }}>
          Deploy Squad
        </button>
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
  const arenaRef = useRef<HTMLDivElement>(null);

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
      <style>{`
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
      `}</style>
      {error&&<div style={{ padding:"0.5rem 1rem",background:"rgba(242,107,107,0.07)",fontSize:"0.56rem",color:"#f26b6b",fontFamily:"'JetBrains Mono',monospace" }}>[ORACLE] {error}</div>}
      <SoldTape ticks={ticks} />
      <CommandBar onScrollToArena={()=>arenaRef.current?.scrollIntoView({behavior:"smooth"})} />
      <div style={{ padding:"1.25rem" }}>
        <ProvenanceBanner />
        <TokenizeCTA />
        <StockPanel assets={assets} />
        <MetalsStrip assets={assets} />
        <SovereignArena assets={assets} arenaRef={arenaRef as React.RefObject<HTMLDivElement>} />
      </div>
    </div>
  );
}