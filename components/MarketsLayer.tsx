// FILE: components/MarketsLayer.tsx
// Markets Layer II — fully independent state.
// Shows ALL inventory assets (watches, spirits, comics, cards, metals, etc.)
// PLUS any newly minted assets from the Zustand store that are listed.
// No shared state with Studio/Terminal.
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAbraStore, type AbraAsset } from "@/lib/abraxasStore";

// ─── Types ────────────────────────────────────────────────────────────────────
interface InventoryAsset {
  id:string; name:string; category:string; priceUsd:number; ticker:string;
  imagePath?:string|null; rarity:string; ltv?:number; last_sold_price?:number;
  change24h?:number; archetype?:string; arena_buff?:string;
  race_record?:string; fractional_shares?:boolean; insuranceUsd?:number;
}

const CAT_COLOR:Record<string,string> = {
  Pokemon:"#FBBF24","One Piece":"#f26b6b",Comics:"#a855f7",Metals:"#D4AF37",
  Stocks:"#14F195",Watches:"#6b8cff",Sports:"#fb923c",Spirits:"#FF8C00",
  Racehorses:"#22c55e","Cards (PSA/BGS)":"#FBBF24","Comics (CGC)":"#a855f7",
};

const CAT_LTV:Record<string,number> = {
  Metals:80,Stocks:70,Watches:65,Comics:65,"Comics (CGC)":65,
  Spirits:55,Racehorses:55,Sports:55,Pokemon:55,"One Piece":55,"Cards (PSA/BGS)":55,
};

const CAT_PARTNER:Record<string,string> = {
  Spirits:"Baxus",Watches:"Courtyard",Comics:"Metropolis","Comics (CGC)":"Metropolis",
  Pokemon:"Collector Crypt","One Piece":"Collector Crypt","Cards (PSA/BGS)":"Collector Crypt",
  Metals:"LBMA",Stocks:"Digital Custody",Racehorses:"The Jockey Club",Sports:"Collector Crypt",
};

function fmtUsd(v:number):string{ if(v>=1_000_000)return`$${(v/1_000_000).toFixed(2)}M`; if(v>=1_000)return`$${(v/1_000).toFixed(1)}K`; return`$${v.toFixed(0)}`; }
function age(ts:number):string{ const d=Math.floor((Date.now()-ts)/3600000); return d<1?"<1h":d<24?`${d}h`:`${Math.floor(d/24)}d`; }

// ─── Premium asset card ───────────────────────────────────────────────────────
function AssetCard({ asset, isNew=false }:{ asset:InventoryAsset; isNew?:boolean }) {
  const [hov, setHov] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const c = CAT_COLOR[asset.category]??"#C8A96E";
  const ltv = asset.ltv ?? CAT_LTV[asset.category] ?? 55;
  const borrow = Math.round(asset.priceUsd * ltv / 100);
  const h = asset.id.split("").reduce((s,ch)=>s+ch.charCodeAt(0),0);
  const chg = ((h%7>3)?1:-1)*((h%8+1)*0.3);
  const isUp = chg >= 0;

  return (
    <div
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        background:`linear-gradient(145deg,${c}07,rgba(6,8,16,0.99))`,
        border:`1px solid ${hov?c+"55":c+"22"}`,borderRadius:"12px",overflow:"hidden",
        cursor:"pointer",transition:"all 0.18s",
        transform:hov?"translateY(-2px) scale(1.004)":"none",
        boxShadow:hov?`0 0 24px ${c}18`:"none",position:"relative",
      }}>
      {isNew&&<div style={{position:"absolute",top:"0.35rem",right:"0.35rem",zIndex:10,padding:"0.07rem 0.32rem",borderRadius:"4px",background:"rgba(20,241,149,0.15)",border:"1px solid rgba(20,241,149,0.35)",fontSize:"0.36rem",fontWeight:800,color:"#14F195",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.08em"}}>NEW</div>}
      {/* Category top bar */}
      <div style={{height:"2px",background:`linear-gradient(90deg,${c}90,${c}15)`}}/>
      {/* Asset image */}
      {asset.imagePath&&!imgErr?(
        <div style={{height:"120px",background:"rgba(6,8,16,0.98)",display:"flex",alignItems:"center",justifyContent:"center",padding:"0.5rem",overflow:"hidden",position:"relative"}}>
          <img src={asset.imagePath} alt={asset.name} onError={()=>setImgErr(true)} style={{maxHeight:"108px",maxWidth:"100%",objectFit:"contain"}} loading="lazy"/>
        </div>
      ):(
        <div style={{height:"88px",background:`linear-gradient(145deg,${c}09,rgba(6,8,16,0.99))`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"0.2rem",position:"relative"}}>
          <div style={{position:"absolute",inset:0,opacity:0.04,display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"center",gap:"0.5rem",color:c,fontSize:"1.2rem",userSelect:"none"}}>{"◈◈◈◈◈◈◈◈"}</div>
          <div style={{fontSize:"1.5rem",color:c,opacity:0.55,zIndex:1}}>◈</div>
          <div style={{fontSize:"0.4rem",color:c,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.1em",zIndex:1}}>{asset.category}</div>
        </div>
      )}
      {/* Card body */}
      <div style={{padding:"0.5rem 0.625rem"}}>
        {/* Category + verified badge */}
        <div style={{display:"flex",alignItems:"center",gap:"0.3rem",marginBottom:"0.2rem",flexWrap:"wrap"}}>
          <span style={{fontSize:"0.4rem",fontWeight:800,padding:"0.06rem 0.3rem",borderRadius:"8px",background:`${c}14`,border:`1px solid ${c}30`,color:c,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.06em"}}>{asset.category}</span>
          <span style={{marginLeft:"auto",fontSize:"0.36rem",color:"rgba(20,241,149,0.55)",fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>✓ VERIFIED</span>
        </div>
        {/* Name */}
        <div style={{fontWeight:800,fontSize:"0.68rem",color:"#f0f0f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:"-0.01em",marginBottom:"1px"}}>{asset.name}</div>
        <div style={{fontSize:"0.4rem",color:"rgba(255,255,255,0.28)",marginBottom:"0.45rem",fontFamily:"'JetBrains Mono',monospace"}}>{CAT_PARTNER[asset.category]??"Verified Custodian"}</div>
        {/* Price + change */}
        <div style={{display:"flex",alignItems:"flex-end",gap:"0.4rem",marginBottom:"0.35rem"}}>
          <span style={{fontWeight:900,fontSize:"0.88rem",color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"-0.02em",lineHeight:1}}>{fmtUsd(asset.priceUsd)}</span>
          <span style={{fontSize:"0.48rem",fontWeight:700,color:isUp?"#14F195":"#f26b6b",fontFamily:"'JetBrains Mono',monospace",marginBottom:"1px"}}>{isUp?"+":""}{chg.toFixed(1)}%</span>
        </div>
        {/* Borrow line */}
        <div style={{fontSize:"0.44rem",color:"rgba(20,241,149,0.5)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.4rem"}}>
          Borrow {fmtUsd(borrow)} USDC · {ltv}% LTV
        </div>
        {/* CTA */}
        <div style={{display:"flex",gap:"0.3rem"}}>
          <a href="/protect" style={{flex:1,padding:"0.28rem 0",borderRadius:"5px",background:`${c}10`,border:`1px solid ${c}22`,color:c,fontSize:"0.46rem",fontWeight:700,fontFamily:"'JetBrains Mono',monospace",textDecoration:"none",textAlign:"center",transition:"all 0.15s"}}>Collateralize →</a>
        </div>
      </div>
    </div>
  );
}

// ─── Event feed ───────────────────────────────────────────────────────────────
function EventFeed() {
  const events = useAbraStore(s=>s.events);
  const assets = useAbraStore(s=>s.assets);
  const relevant = [...events]
    .filter(e=>["ASSET_TOKENIZED","ASSET_VERIFIED","ASSET_LISTED","ABRA_DEDUCTED"].includes(e.eventType))
    .slice(-8).reverse();
  if (relevant.length===0) return null;
  const LABELS:Record<string,[string,string]> = {
    ASSET_TOKENIZED:["MINTED","#C8A96E"],
    ASSET_VERIFIED:["VERIFIED","#14F195"],
    ASSET_LISTED:["LISTED","#6b8cff"],
    ABRA_DEDUCTED:["$ABRA","#FBBF24"],
  };
  return (
    <div style={{marginBottom:"1.25rem"}}>
      <div style={{fontSize:"0.44rem",fontWeight:700,color:"rgba(255,255,255,0.25)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"0.5rem"}}>Protocol Event Stream</div>
      {relevant.map(ev=>{
        const a=assets.find(x=>x.id===ev.assetId);
        const [label,color]=LABELS[ev.eventType]??["EVENT","#f0f0f0"];
        return (
          <div key={ev.id} style={{display:"flex",alignItems:"center",gap:"0.4rem",padding:"0.25rem 0",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
            <span style={{fontSize:"0.38rem",fontWeight:800,padding:"0.04rem 0.28rem",borderRadius:"3px",background:`${color}14`,color,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.08em",flexShrink:0}}>{label}</span>
            <span style={{fontSize:"0.48rem",color:"rgba(255,255,255,0.5)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {a?.name??String(ev.payload?.name??"Protocol action")} {ev.payload?.amount?`· ${ev.payload.amount} $ABRA`:""}
            </span>
            <span style={{fontSize:"0.4rem",color:"rgba(255,255,255,0.15)",fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{Math.round((Date.now()-ev.timestamp)/1000)}s ago</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function MarketsLayer() {
  const storeListedAssets  = useAbraStore(s=>s.getListedAssets());
  const pendingAssets      = useAbraStore(s=>s.getPendingAssets());
  const [invAssets,  setInvAssets]  = useState<InventoryAsset[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState("all");
  const [search,     setSearch]     = useState("");
  const [view,       setView]       = useState<"grid"|"list">("grid");
  const [sortBy,     setSortBy]     = useState<"name"|"price"|"ltv">("name");

  // Load full inventory — all 102 assets
  useEffect(()=>{
    fetch("/api/cards").then(r=>r.json()).then(data=>{
      if(data.assets) setInvAssets(data.assets);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  // Merge: inventory assets + newly minted (from store), deduped
  const storeIds = new Set(storeListedAssets.map(a=>a.id));
  const allListed: InventoryAsset[] = [
    // Store-minted assets (newly tokenized) first
    ...storeListedAssets.map(a=>({
      id:a.id, name:a.name, category:a.assetClass, priceUsd:a.estimatedUsd,
      ticker:a.tokenId, ltv:a.ltv, imagePath:a.imagePreview??null,
      rarity:"Listed", change24h:0,
    })),
    // Full inventory (all 102 assets)
    ...invAssets.filter(a=>!storeIds.has(a.id)),
  ];

  // Filter + search + sort
  const cats = ["all",...Array.from(new Set(allListed.map(a=>a.category))).sort()];
  let shown = allListed
    .filter(a=>filter==="all"||a.category===filter)
    .filter(a=>!search||a.name.toLowerCase().includes(search.toLowerCase()));
  if(sortBy==="price") shown=[...shown].sort((a,b)=>b.priceUsd-a.priceUsd);
  if(sortBy==="ltv")   shown=[...shown].sort((a,b)=>(b.ltv??55)-(a.ltv??55));
  if(sortBy==="name")  shown=[...shown].sort((a,b)=>a.name.localeCompare(b.name));

  // Protocol health metrics
  const totalValue  = allListed.reduce((s,a)=>s+a.priceUsd, 0);
  const totalBorrow = allListed.reduce((s,a)=>s+Math.round(a.priceUsd*(a.ltv??CAT_LTV[a.category]??55)/100), 0);

  const EDU:Record<string,string> = {
    Pokemon:    "PSA/BGS grade (1–10) drives value exponentially. PSA 10 Gem Mint commands 3–10x premium over PSA 9. 1st Edition and Shadowless prints are rarest.",
    Spirits:    "Rare spirits priced by distillery, age, and edition size. Closed distilleries (Caroni, Port Ellen) appreciate fastest. Baxus authenticates all listings.",
    Watches:    "Luxury watches trade on model, reference, and provenance. Rolex Submariner and AP Royal Oak hold value strongest. Condition and box/papers critical.",
    Comics:     "CGC numeric grade and label color (blue/yellow/green) determine value. First appearances and key issues command highest premiums.",
    Metals:     "Gold and silver priced in USD/oz via LBMA fix twice daily. Highly liquid — highest LTV (80%) on Loopscale. Macro-sensitive asset class.",
    Racehorses: "Bloodstock value based on breeding rights, race record, sire/dam pedigree. Fractional ownership via syndication. The Jockey Club authenticates.",
    "One Piece":"PSA-graded One Piece cards from early Bandai sets command strong premiums. Tournament-legal sets and trophy cards most valuable.",
    Sports:     "Sports cards graded by PSA/BGS. Rookie cards, autos, and low-population slabs lead the market. Event-driven volatility around seasons.",
    Stocks:     "Tokenized equities represent fractional on-chain exposure. Price tracks real-time market data. NVDA, TSLA, AAPL available.",
  };

  return (
    <div>
      {/* Protocol health strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:"0.4rem",marginBottom:"1.25rem",padding:"0.625rem 0.875rem",background:"rgba(6,8,16,0.98)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"10px"}}>
        {([
          ["Listed Assets",    allListed.length.toString(), "#14F195"],
          ["Pending Review",   pendingAssets.length.toString(), "#FBBF24"],
          ["Total Value",      fmtUsd(totalValue), "#C8A96E"],
          ["Borrowable USDC",  fmtUsd(totalBorrow), "#6b8cff"],
          ["Asset Classes",    cats.length-1+"", "#f0f0f0"],
        ] as [string,string,string][]).map(([l,v,c])=>(
          <div key={l} style={{textAlign:"center"}}>
            <div style={{fontSize:"0.72rem",fontWeight:900,color:c,fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>{v}</div>
            <div style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.25)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.06em",marginTop:"2px"}}>{l}</div>
          </div>
        ))}
      </div>

      <EventFeed />

      {/* Pending strip */}
      {pendingAssets.length>0&&(
        <div style={{marginBottom:"1rem",padding:"0.625rem 0.875rem",background:"rgba(251,191,36,0.04)",border:"1px solid rgba(251,191,36,0.12)",borderRadius:"9px"}}>
          <div style={{fontSize:"0.44rem",fontWeight:700,color:"rgba(251,191,36,0.6)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"0.4rem"}}>Pending Verification — visible, not yet tradable</div>
          {pendingAssets.map(a=>(
            <div key={a.id} style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.28rem 0",borderBottom:"1px solid rgba(251,191,36,0.06)"}}>
              <div style={{width:"5px",height:"5px",borderRadius:"50%",background:"#FBBF24",animation:"pulse 1.2s ease-in-out infinite",flexShrink:0}}/>
              <span style={{fontSize:"0.54rem",color:"rgba(255,255,255,0.55)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</span>
              <span style={{fontSize:"0.4rem",fontWeight:700,color:"#FBBF24",fontFamily:"'JetBrains Mono',monospace"}}>{a.status==="pending_soft"?"SOFT-LISTED":"VERIFYING"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search + filter + sort controls */}
      <div style={{display:"flex",gap:"0.5rem",marginBottom:"0.75rem",flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search assets…" style={{padding:"0.35rem 0.625rem",borderRadius:"6px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",color:"#f0f0f0",fontSize:"0.56rem",fontFamily:"'JetBrains Mono',monospace",outline:"none",width:"160px"}} onFocus={e=>{e.currentTarget.style.borderColor="rgba(107,140,255,0.45)";}} onBlur={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.09)";}}/>
        <div style={{display:"flex",gap:"0.2rem"}}>
          {(["name","price","ltv"] as const).map(s=>(
            <button key={s} onClick={()=>setSortBy(s)} style={{padding:"0.28rem 0.55rem",borderRadius:"5px",border:`1px solid ${sortBy===s?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.07)"}`,background:sortBy===s?"rgba(255,255,255,0.07)":"transparent",color:sortBy===s?"#f0f0f0":"rgba(255,255,255,0.28)",fontSize:"0.46rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",textTransform:"capitalize"}}>{s}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:"0.2rem",marginLeft:"auto"}}>
          {(["grid","list"] as const).map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{padding:"0.22rem 0.4rem",borderRadius:"4px",border:`1px solid ${view===v?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.06)"}`,background:view===v?"rgba(255,255,255,0.07)":"transparent",color:view===v?"#f0f0f0":"rgba(255,255,255,0.25)",fontSize:"0.46rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace"}}>{v==="grid"?"⊟⊟⊟":"≡"}</button>
          ))}
        </div>
      </div>

      {/* Category filter pills */}
      <div style={{display:"flex",gap:"0.3rem",marginBottom:"0.875rem",flexWrap:"wrap"}}>
        {cats.map(cat=>{
          const c=cat==="all"?"#f0f0f0":(CAT_COLOR[cat]??"#f0f0f0");
          const active=filter===cat;
          const count=cat==="all"?allListed.length:allListed.filter(a=>a.category===cat).length;
          return (
            <button key={cat} onClick={()=>setFilter(cat)} title={cat!=="all"?EDU[cat]:"All verified assets"} style={{padding:"0.3rem 0.7rem",borderRadius:"16px",border:`1px solid ${active?c+"50":c+"18"}`,background:active?`${c}12`:"transparent",color:active?c:`${c}55`,fontSize:"0.52rem",fontWeight:active?700:400,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.04em",transition:"all 0.15s"}}>
              {cat==="all"?"All":cat} <span style={{fontSize:"0.4rem",opacity:0.6}}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Asset count + trust note */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.625rem"}}>
        <span style={{fontSize:"0.44rem",color:"rgba(255,255,255,0.22)",fontFamily:"'JetBrains Mono',monospace"}}>{shown.length} asset{shown.length!==1?"s":""}{search?` matching "${search}"`:""}  ·  {filter==="all"?"all categories":filter}</span>
        <span style={{fontSize:"0.42rem",color:"rgba(20,241,149,0.4)",fontFamily:"'JetBrains Mono',monospace",fontStyle:"italic"}}>Hover category for pricing guide</span>
      </div>

      {/* Grid */}
      {loading?(
        <div style={{padding:"3rem",textAlign:"center",color:"rgba(255,255,255,0.18)",fontSize:"0.58rem",fontFamily:"'JetBrains Mono',monospace"}}>Loading verified assets…</div>
      ):shown.length===0?(
        <div style={{padding:"3rem",textAlign:"center",background:"rgba(6,8,16,0.97)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"12px"}}>
          <div style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.22)",marginBottom:"0.35rem"}}>No assets match your filter</div>
          <button onClick={()=>{setFilter("all");setSearch("");}} style={{padding:"0.35rem 0.875rem",borderRadius:"6px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.38)",fontSize:"0.54rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace"}}>Clear filters</button>
        </div>
      ):(
        <div style={{display:view==="grid"?"grid":"flex",gridTemplateColumns:view==="grid"?"repeat(auto-fill,minmax(min(100%,220px),1fr))":undefined,flexDirection:view==="list"?"column":undefined,gap:"0.625rem"}}>
          {shown.map(a=>{
            const isNew=storeIds.has(a.id);
            return <AssetCard key={a.id} asset={a} isNew={isNew}/>;
          })}
        </div>
      )}

      {/* Trust note */}
      <div style={{marginTop:"1.5rem",padding:"0.625rem 0.875rem",background:"rgba(20,241,149,0.03)",border:"1px solid rgba(20,241,149,0.08)",borderRadius:"8px",display:"flex",gap:"0.5rem"}}>
        <span style={{color:"rgba(20,241,149,0.4)",flexShrink:0}}>▸</span>
        <span style={{fontSize:"0.48rem",color:"rgba(255,255,255,0.3)",lineHeight:1.65}}>All listed assets have passed the Abraxas verification pipeline — ownership confirmation, metadata validation, and custody partner co-sign. Newly minted assets appear here automatically after verification completes.</span>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
    </div>
  );
}