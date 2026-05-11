// FILE: components/MarketsLayer.tsx
// Markets Layer II — Fully independent. Reads ONLY from Zustand store assets.status=listed.
// NO shared state with Studio/Terminal. Event-driven reactivity via store subscription.
"use client";

import { useState, useEffect } from "react";
import { useAbraStore, type AbraAsset } from "@/lib/abraxasStore";

const CAT_COLOR: Record<string,string> = {
  "Spirits":"#FF8C00","Watches":"#6b8cff","Cards (PSA/BGS)":"#FBBF24",
  "Comics (CGC)":"#a855f7","Racehorses":"#22c55e","Metals":"#D4AF37",
  "Art":"#f26b6b","Other":"#C8A96E",
};
function fmtUsd(v:number):string { if(v>=1_000_000) return `$${(v/1_000_000).toFixed(2)}M`; if(v>=1_000) return `$${(v/1_000).toFixed(1)}K`; return `$${v.toFixed(0)}`; }
function age(ts:number):string { const d=Math.floor((Date.now()-ts)/3600000); return d<1?"<1h ago":d<24?`${d}h ago`:`${Math.floor(d/24)}d ago`; }

// ─── Market card ──────────────────────────────────────────────────────────────
function MarketCard({ asset }:{ asset:AbraAsset }) {
  const [hov, setHov] = useState(false);
  const c = CAT_COLOR[asset.assetClass]??"#C8A96E";
  const borrow = Math.round(asset.estimatedUsd * asset.ltv / 100);
  const chg = ((Math.sin(asset.id.charCodeAt(0)*7)>0)?1:-1)*((asset.id.charCodeAt(1)%8)+0.5);
  const isUp = chg >= 0;

  return (
    <div
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:`linear-gradient(145deg,${c}07,rgba(6,8,16,0.99))`,border:`1px solid ${hov?c+"50":c+"22"}`,borderRadius:"12px",overflow:"hidden",cursor:"pointer",transition:"all 0.18s",transform:hov?"translateY(-2px) scale(1.005)":"none",boxShadow:hov?`0 0 24px ${c}18`:"none" }}>
      {/* Category bar */}
      <div style={{ height:"2px",background:`linear-gradient(90deg,${c}80,${c}20)` }} />
      <div style={{ padding:"0.625rem 0.75rem" }}>
        {/* Header row */}
        <div style={{ display:"flex",alignItems:"center",gap:"0.35rem",marginBottom:"0.3rem",flexWrap:"wrap" }}>
          <span style={{ fontSize:"0.4rem",fontWeight:800,padding:"0.06rem 0.32rem",borderRadius:"8px",background:`${c}18`,border:`1px solid ${c}35`,color:c,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.08em" }}>{asset.assetClass}</span>
          <span style={{ marginLeft:"auto",fontSize:"0.38rem",color:"rgba(20,241,149,0.6)",fontFamily:"'JetBrains Mono',monospace",padding:"0.04rem 0.25rem",borderRadius:"3px",background:"rgba(20,241,149,0.07)",border:"1px solid rgba(20,241,149,0.15)" }}>VERIFIED</span>
        </div>
        {/* Name */}
        <div style={{ fontWeight:800,fontSize:"0.68rem",color:"#f0f0f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:"-0.01em",marginBottom:"2px" }}>{asset.name}</div>
        <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.32)",marginBottom:"0.5rem",fontFamily:"'JetBrains Mono',monospace" }}>
          {asset.grade}{asset.grade&&asset.year?" · ":""}{asset.year} · {asset.custodyPartner}
        </div>
        {/* Price row */}
        <div style={{ display:"flex",alignItems:"flex-end",gap:"0.5rem",marginBottom:"0.45rem" }}>
          <span style={{ fontWeight:900,fontSize:"0.88rem",color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"-0.02em",lineHeight:1 }}>{fmtUsd(asset.estimatedUsd)}</span>
          <span style={{ fontSize:"0.5rem",fontWeight:700,color:isUp?"#14F195":"#f26b6b",fontFamily:"'JetBrains Mono',monospace",marginBottom:"1px" }}>{isUp?"+":""}{chg.toFixed(1)}%</span>
        </div>
        {/* Borrow line */}
        <div style={{ fontSize:"0.46rem",color:"rgba(20,241,149,0.55)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.45rem" }}>
          Borrow {fmtUsd(borrow)} USDC · {asset.ltv}% LTV · 5.2% APR
        </div>
        {/* Listed timestamp */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <span style={{ fontSize:"0.4rem",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace" }}>Listed {asset.listedAt?age(asset.listedAt):"recently"}</span>
          <a href="/protect" style={{ fontSize:"0.44rem",fontWeight:700,color:c,fontFamily:"'JetBrains Mono',monospace",textDecoration:"none",padding:"0.12rem 0.4rem",borderRadius:"4px",background:`${c}10`,border:`1px solid ${c}25` }}>Collateralize →</a>
        </div>
      </div>
    </div>
  );
}

// ─── Pending asset row ────────────────────────────────────────────────────────
function PendingRow({ asset }:{ asset:AbraAsset }) {
  const c = CAT_COLOR[asset.assetClass]??"#C8A96E";
  const isPendingSoft = asset.status==="pending_soft";
  return (
    <div style={{ display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.45rem 0.75rem",background:"rgba(251,191,36,0.03)",border:"1px solid rgba(251,191,36,0.1)",borderRadius:"8px",marginBottom:"0.3rem" }}>
      <div style={{ width:"6px",height:"6px",borderRadius:"50%",background:"#FBBF24",animation:"pulse 1.2s ease-in-out infinite",flexShrink:0 }} />
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontSize:"0.56rem",fontWeight:600,color:"rgba(255,255,255,0.6)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{asset.name}</div>
        <div style={{ fontSize:"0.42rem",color:"rgba(255,255,255,0.25)",fontFamily:"'JetBrains Mono',monospace" }}>{asset.assetClass} · {fmtUsd(asset.estimatedUsd)}</div>
      </div>
      <div style={{ padding:"0.1rem 0.4rem",borderRadius:"4px",background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.2)",flexShrink:0 }}>
        <span style={{ fontSize:"0.4rem",fontWeight:700,color:"#FBBF24",fontFamily:"'JetBrains Mono',monospace" }}>{isPendingSoft?"SOFT-LISTED":"VERIFYING"}</span>
      </div>
    </div>
  );
}

// ─── Live event feed ──────────────────────────────────────────────────────────
function EventFeed() {
  const events = useAbraStore(s=>s.events);
  const assets = useAbraStore(s=>s.assets);

  const relevant = [...events]
    .filter(e=>["ASSET_TOKENIZED","ASSET_VERIFIED","ASSET_LISTED","ABRA_DEDUCTED"].includes(e.eventType))
    .slice(-8).reverse();

  if (relevant.length===0) return null;
  return (
    <div style={{ marginBottom:"1.25rem" }}>
      <div style={{ fontSize:"0.44rem",fontWeight:700,color:"rgba(255,255,255,0.25)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"0.5rem" }}>Protocol Event Stream</div>
      {relevant.map(ev=>{
        const a = assets.find(x=>x.id===ev.assetId);
        const LABELS:Record<string,[string,string]> = {
          ASSET_TOKENIZED:["MINTED","#C8A96E"],
          ASSET_VERIFIED: ["VERIFIED","#14F195"],
          ASSET_LISTED:   ["LISTED","#6b8cff"],
          ABRA_DEDUCTED:  ["$ABRA","#FBBF24"],
        };
        const [label,color] = LABELS[ev.eventType]??["EVENT","#f0f0f0"];
        return (
          <div key={ev.id} style={{ display:"flex",alignItems:"center",gap:"0.4rem",padding:"0.25rem 0",borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
            <span style={{ fontSize:"0.38rem",fontWeight:800,padding:"0.04rem 0.28rem",borderRadius:"3px",background:`${color}14`,color,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.08em",flexShrink:0 }}>{label}</span>
            <span style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.5)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
              {a?.name??ev.payload?.name as string??"Protocol action"} {ev.payload?.amount?`· ${ev.payload.amount} $ABRA`:""}
            </span>
            <span style={{ fontSize:"0.4rem",color:"rgba(255,255,255,0.15)",fontFamily:"'JetBrains Mono',monospace",flexShrink:0" }}>{Math.round((Date.now()-ev.timestamp)/1000)}s ago</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main MarketsLayer export ─────────────────────────────────────────────────
export function MarketsLayer() {
  const listed  = useAbraStore(s=>s.getListedAssets());
  const pending = useAbraStore(s=>s.getPendingAssets());
  const assets  = useAbraStore(s=>s.assets);
  const [filter,  setFilter]  = useState<string>("all");
  const [view,    setView]    = useState<"grid"|"list">("grid");
  const [tooltip, setTooltip] = useState<string|null>(null);

  const ALL_CATS = ["all",...Array.from(new Set(listed.map(a=>a.assetClass)))];
  const shown = filter==="all"?listed:listed.filter(a=>a.assetClass===filter);

  // Education tooltips by category
  const EDU:Record<string,string> = {
    "Spirits":    "Rare spirits are valued by distillery, vintage, and scarcity. Baxus authenticates via blockchain-tracked ownership.",
    "Watches":    "Luxury watches trade on model, condition, and provenance. Rolex and AP hold value best in secondary markets.",
    "Cards (PSA/BGS)":"PSA/BGS grade (1–10) is the single biggest price driver. PSA 10 commands exponential premiums over PSA 9.",
    "Comics (CGC)":"CGC numeric grade and label color (blue/yellow/green) determine value. First appearances and key issues lead.",
    "Metals":     "Precious metals price in USD/oz via LBMA fix. Gold and silver are macro-sensitive. 80% LTV — safest collateral.",
    "Racehorses": "Bloodstock value based on breeding rights, race record, and lineage. Fractional ownership enabled.",
  };

  const totalTVL   = listed.reduce((s,a)=>s+a.estimatedUsd,0);
  const totalBorrow = listed.reduce((s,a)=>s+Math.round(a.estimatedUsd*a.ltv/100),0);

  return (
    <div>
      {/* Protocol health strip */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:"0.4rem",marginBottom:"1.25rem",padding:"0.625rem 0.875rem",background:"rgba(6,8,16,0.98)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"10px" }}>
        {([
          ["Listed Assets",     listed.length.toString(),    "#14F195"],
          ["Pending Review",    pending.length.toString(),   "#FBBF24"],
          ["Total Asset Value", fmtUsd(totalTVL),            "#C8A96E"],
          ["Borrowable USDC",   fmtUsd(totalBorrow),         "#6b8cff"],
          ["Avg LTV",           `${Math.round(listed.reduce((s,a)=>s+a.ltv,0)/(listed.length||1))}%`,"#f0f0f0"],
        ] as [string,string,string][]).map(([l,v,c])=>(
          <div key={l} style={{ textAlign:"center" }}>
            <div style={{ fontSize:"0.68rem",fontWeight:800,color:c,fontFamily:"'JetBrains Mono',monospace",lineHeight:1 }}>{v}</div>
            <div style={{ fontSize:"0.38rem",color:"rgba(255,255,255,0.25)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.06em",marginTop:"2px" }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Event feed */}
      <EventFeed />

      {/* Pending preview */}
      {pending.length>0&&(
        <div style={{ marginBottom:"1.25rem" }}>
          <div style={{ fontSize:"0.44rem",fontWeight:700,color:"rgba(251,191,36,0.5)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"0.5rem" }}>
            Pending Verification — visible but not yet tradable
          </div>
          {pending.map(a=><PendingRow key={a.id} asset={a} />)}
        </div>
      )}

      {/* Filter + view controls */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.875rem",flexWrap:"wrap",gap:"0.4rem" }}>
        <div style={{ display:"flex",gap:"0.3rem",flexWrap:"wrap" }}>
          {ALL_CATS.map(cat=>{
            const c = cat==="all"?"#f0f0f0":(CAT_COLOR[cat]??"#f0f0f0");
            const active=filter===cat;
            return (
              <button key={cat} onClick={()=>setFilter(cat)}
                onMouseEnter={()=>setTooltip(cat!=="all"?EDU[cat]??null:null)}
                onMouseLeave={()=>setTooltip(null)}
                style={{ padding:"0.3rem 0.7rem",borderRadius:"16px",border:`1px solid ${active?c+"50":c+"18"}`,background:active?`${c}12`:"transparent",color:active?c:`${c}55`,fontSize:"0.54rem",fontWeight:active?700:400,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.04em",transition:"all 0.15s" }}>
                {cat==="all"?"All":cat}
              </button>
            );
          })}
        </div>
        <div style={{ display:"flex",gap:"0.2rem" }}>
          {(["grid","list"] as const).map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{ padding:"0.22rem 0.4rem",borderRadius:"4px",border:`1px solid ${view===v?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.06)"}`,background:view===v?"rgba(255,255,255,0.07)":"transparent",color:view===v?"#f0f0f0":"rgba(255,255,255,0.25)",fontSize:"0.46rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>{v==="grid"?"⊟⊟⊟":"≡"}</button>
          ))}
        </div>
      </div>

      {/* Education tooltip */}
      {tooltip&&<div style={{ padding:"0.4rem 0.75rem",background:"rgba(107,140,255,0.07)",border:"1px solid rgba(107,140,255,0.18)",borderRadius:"6px",marginBottom:"0.75rem",fontSize:"0.5rem",color:"rgba(255,255,255,0.5)",lineHeight:1.65 }}>{tooltip}</div>}

      {/* Asset count */}
      <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.625rem" }}>{shown.length} verified asset{shown.length!==1?"s":""} · {filter==="all"?"all categories":filter} · tradable + collateralizable</div>

      {/* Grid */}
      {shown.length>0?(
        <div style={{ display: view==="grid"?"grid":"flex", gridTemplateColumns:view==="grid"?"repeat(auto-fill,minmax(min(100%,240px),1fr))":undefined, flexDirection:view==="list"?"column":undefined, gap:"0.625rem" }}>
          {shown.map(a=><MarketCard key={a.id} asset={a} />)}
        </div>
      ):(
        <div style={{ padding:"3rem",textAlign:"center",background:"rgba(6,8,16,0.97)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"12px" }}>
          <div style={{ fontSize:"0.6rem",color:"rgba(255,255,255,0.2)",marginBottom:"0.35rem" }}>No verified assets in this category</div>
          <div style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.15)" }}>Tokenize an asset in Studio to add to Markets</div>
        </div>
      )}

      {/* Markets trust note */}
      <div style={{ marginTop:"1.5rem",padding:"0.625rem 0.875rem",background:"rgba(20,241,149,0.03)",border:"1px solid rgba(20,241,149,0.08)",borderRadius:"8px",display:"flex",gap:"0.5rem",alignItems:"flex-start" }}>
        <span style={{ color:"rgba(20,241,149,0.4)",flexShrink:0,marginTop:"1px" }}>▸</span>
        <span style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.3)",lineHeight:1.65 }}>All listed assets have passed the Abraxas verification pipeline — ownership confirmation, metadata validation, and custody partner co-sign. Assets in "pending" state are not yet tradable.</span>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
    </div>
  );
}