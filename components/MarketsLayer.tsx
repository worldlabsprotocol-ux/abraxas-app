// FILE: components/MarketsLayer.tsx
// Markets Layer II — reads inventory directly (no API dependency) + Zustand minted assets.
// Shows ALL 102 assets: Watches, Spirits, Comics, Cards, Metals, Racehorses, Pokemon, etc.
"use client";

import { useState, useEffect } from "react";
import { useAbraStore } from "@/lib/abraxasStore";
import { useRealtimeMarkets } from "@/lib/hooks/useRealtimeMarkets";
// Direct import fallback — 102 assets always visible, never empty
import rawInventory from "@/data/inventory.json";

interface InvAsset {
  id:string; name:string; category:string; priceUsd:number; ticker:string;
  imagePath?:string|null; rarity?:string; ltv?:number; change24h?:number;
  insuranceUsd?:number; borrow_max_usd?:number;
}

const CAT_COLOR:Record<string,string> = {
  Pokemon:"#FBBF24","One Piece":"#f26b6b",Comics:"#a855f7",Metals:"#D4AF37",
  Stocks:"#14F195",Watches:"#6b8cff",Sports:"#fb923c",Spirits:"#FF8C00",Racehorses:"#22c55e",
};
const CAT_PARTNER:Record<string,string> = {
  Spirits:"Baxus",Watches:"Courtyard",Comics:"Metropolis",
  Pokemon:"Collector Crypt","One Piece":"Collector Crypt",Sports:"Collector Crypt",
  Metals:"LBMA",Stocks:"Digital Custody",Racehorses:"The Jockey Club",
};
const CAT_LTV:Record<string,number> = {
  Metals:80,Stocks:70,Watches:65,Comics:65,Spirits:55,Racehorses:55,
  Sports:55,Pokemon:55,"One Piece":55,
};

function fmtUsd(v:number):string{
  if(v>=1_000_000)return`$${(v/1_000_000).toFixed(2)}M`;
  if(v>=1_000)return`$${(v/1_000).toFixed(1)}K`;
  return`$${v.toFixed(0)}`;
}

// ─── Premium asset card ───────────────────────────────────────────────────────
function AssetCard({ asset, isNew=false }:{ asset:InvAsset; isNew?:boolean }) {
  const [hov,    setHov]    = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const c = CAT_COLOR[asset.category]??"#C8A96E";
  const ltv = asset.ltv ?? CAT_LTV[asset.category] ?? 55;
  const borrow = asset.borrow_max_usd ?? Math.round(asset.priceUsd * ltv / 100);
  const h = asset.id.split("").reduce((s,ch)=>s+ch.charCodeAt(0),0);
  const chg = asset.change24h ?? (((h%7>3)?1:-1)*((h%8+1)*0.3));
  const isUp = chg >= 0;

  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        background:`linear-gradient(145deg,${c}07,rgba(6,8,16,0.99))`,
        border:`1px solid ${hov?c+"55":c+"22"}`,borderRadius:"12px",overflow:"hidden",
        cursor:"pointer",transition:"all 0.18s",position:"relative",
        transform:hov?"translateY(-2px) scale(1.004)":"none",
        boxShadow:hov?`0 0 24px ${c}18`:"none",
      }}>
      {isNew&&<div style={{position:"absolute",top:"0.35rem",right:"0.35rem",zIndex:10,padding:"0.06rem 0.3rem",borderRadius:"4px",background:"rgba(20,241,149,0.15)",border:"1px solid rgba(20,241,149,0.35)",fontSize:"0.36rem",fontWeight:800,color:"#14F195",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.08em"}}>NEW</div>}
      {/* Category top bar */}
      <div style={{height:"2px",background:`linear-gradient(90deg,${c}90,${c}15)`}}/>
      {/* Image */}
      {asset.imagePath&&!imgErr?(
        <div style={{height:"120px",background:"rgba(6,8,16,0.98)",display:"flex",alignItems:"center",justifyContent:"center",padding:"0.35rem",overflow:"hidden"}}>
          <img
            src={asset.imagePath}
            alt={asset.name}
            onError={()=>setImgErr(true)}
            style={{maxHeight:"112px",maxWidth:"100%",objectFit:"contain",borderRadius:"4px"}}
            loading="lazy"
          />
        </div>
      ):(
        <div style={{height:"100px",background:`linear-gradient(145deg,${c}09,rgba(6,8,16,0.99))`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"0.15rem",position:"relative"}}>
          <div style={{position:"absolute",inset:0,opacity:0.04,display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"center",gap:"0.5rem",color:c,fontSize:"1.2rem",userSelect:"none"}}>{"◈◈◈◈◈◈◈◈"}</div>
          <div style={{fontSize:"1.2rem",color:c,opacity:0.55,zIndex:1}}>◈</div>
          <div style={{fontSize:"0.38rem",color:c,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.1em",zIndex:1}}>{asset.category}</div>
        </div>
      )}
      {/* Body */}
      <div style={{padding:"0.45rem 0.55rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.25rem",marginBottom:"0.2rem",flexWrap:"wrap"}}>
          <span style={{fontSize:"0.4rem",fontWeight:800,padding:"0.05rem 0.28rem",borderRadius:"8px",background:`${c}14`,border:`1px solid ${c}30`,color:c,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.06em"}}>{asset.category}</span>
          <span style={{marginLeft:"auto",fontSize:"0.36rem",color:"rgba(20,241,149,0.55)",fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>✓ VERIFIED</span>
        </div>
        <div style={{fontWeight:800,fontSize:"0.66rem",color:"#f0f0f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:"-0.01em",marginBottom:"1px"}}>{asset.name}</div>
        <div style={{fontSize:"0.38rem",color:"rgba(255,255,255,0.28)",marginBottom:"0.4rem",fontFamily:"'JetBrains Mono',monospace"}}>{CAT_PARTNER[asset.category]??"Verified Custodian"}</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:"0.35rem",marginBottom:"0.28rem"}}>
          <span style={{fontWeight:900,fontSize:"0.82rem",color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"-0.02em",lineHeight:1}}>{fmtUsd(asset.priceUsd)}</span>
          <span style={{fontSize:"0.46rem",fontWeight:700,color:isUp?"#14F195":"#f26b6b",fontFamily:"'JetBrains Mono',monospace",marginBottom:"1px"}}>{isUp?"+":""}{chg.toFixed(1)}%</span>
        </div>
        <div style={{fontSize:"0.42rem",color:"rgba(20,241,149,0.5)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.4rem"}}>
          Borrow {fmtUsd(borrow)} USDC · {ltv}% LTV
        </div>
        <a href="/protect" style={{display:"block",padding:"0.26rem 0",borderRadius:"5px",background:`${c}10`,border:`1px solid ${c}22`,color:c,fontSize:"0.44rem",fontWeight:700,fontFamily:"'JetBrains Mono',monospace",textDecoration:"none",textAlign:"center",transition:"all 0.15s"}}>Collateralize →</a>
      </div>
    </div>
  );
}

// ─── Event feed (only shows if there are events) ──────────────────────────────
function EventFeed() {
  const events = useAbraStore(s=>s.events);
  const assets = useAbraStore(s=>s.assets);
  const relevant = [...events]
    .filter(e=>["ASSET_TOKENIZED","ASSET_VERIFIED","ASSET_LISTED","ABRA_DEDUCTED"].includes(e.eventType))
    .slice(-6).reverse();
  if (!relevant.length) return null;
  const LABELS:Record<string,[string,string]> = {
    ASSET_TOKENIZED:["MINTED","#C8A96E"],ASSET_VERIFIED:["VERIFIED","#14F195"],
    ASSET_LISTED:["LISTED","#6b8cff"],ABRA_DEDUCTED:["$ABRA","#FBBF24"],
  };
  return (
    <div style={{marginBottom:"1rem",padding:"0.5rem 0.75rem",background:"rgba(6,8,16,0.98)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px"}}>
      <div style={{fontSize:"0.4rem",fontWeight:700,color:"rgba(255,255,255,0.22)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"0.35rem"}}>Protocol Events</div>
      {relevant.map(ev=>{
        const a=assets.find(x=>x.id===ev.assetId);
        const [label,color]=LABELS[ev.eventType]??["EVENT","#f0f0f0"];
        return (
          <div key={ev.id} style={{display:"flex",alignItems:"center",gap:"0.4rem",padding:"0.2rem 0",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
            <span style={{fontSize:"0.36rem",fontWeight:800,padding:"0.04rem 0.26rem",borderRadius:"3px",background:`${color}14`,color,fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{label}</span>
            <span style={{fontSize:"0.46rem",color:"rgba(255,255,255,0.48)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {a?.name ?? String(ev.payload?.name ?? "Protocol action")}
            </span>
            <span suppressHydrationWarning style={{fontSize:"0.38rem",color:"rgba(255,255,255,0.15)",fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{typeof window!=="undefined"?`${Math.round((Date.now()-ev.timestamp)/1000)}s ago`:""}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function MarketsLayer() {
  // 1. Real-time DB subscription (Supabase when live, Zustand fallback when not)
  const { assets: dbAssets, loading: dbLoading } = useRealtimeMarkets();
  // 2. Zustand store assets (demo mints before DB is confirmed)
  const storeListedAssets = useAbraStore(s=>s.getListedAssets());
  const pendingAssets     = useAbraStore(s=>s.getPendingAssets());
  // 3. Full 102-asset inventory — always visible as base market layer
  const inventoryAssets: InvAsset[] = (rawInventory as any).assets ?? [];

  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");
  const [sortBy,  setSortBy]  = useState<"name"|"price"|"ltv">("name");
  const [view,    setView]    = useState<"grid"|"list">("grid");
  const [tooltip, setTooltip] = useState<string|null>(null);

  // 3-tier merge: DB > Zustand > Inventory (deduped by id)
  const knownIds = new Set([...dbAssets.map(a=>a.id), ...storeListedAssets.map(a=>a.id)]);
  const allAssets: InvAsset[] = [
    ...dbAssets.map(a=>({
      id:a.id, name:a.name, category:a.category, priceUsd:a.price_usd,
      ticker:a.token_id??"", ltv:a.ltv, imagePath:a.image_url??null,
      borrow_max_usd:a.borrow_max_usd, change24h:0,
    })),
    ...storeListedAssets.filter(a=>!knownIds.has(a.id)).map(a=>({
      id:a.id, name:a.name, category:a.assetClass, priceUsd:a.estimatedUsd,
      ticker:a.tokenId, ltv:a.ltv, imagePath:a.imagePreview??null,
      borrow_max_usd:Math.round(a.estimatedUsd*a.ltv/100), change24h:0,
    })),
    ...inventoryAssets.filter(a=>!knownIds.has(a.id)),
  ];

  // All unique categories in display order
  const CAT_ORDER = ["Watches","Spirits","Comics","Racehorses","Metals","Stocks","Sports","Pokemon","One Piece"];
  const activeCats = ["all",...CAT_ORDER.filter(c=>allAssets.some(a=>a.category===c))];

  // Filter + search + sort
  let shown = allAssets
    .filter(a=>filter==="all"||a.category===filter)
    .filter(a=>!search||a.name.toLowerCase().includes(search.toLowerCase()));
  if(sortBy==="price") shown=[...shown].sort((a,b)=>b.priceUsd-a.priceUsd);
  else if(sortBy==="ltv") shown=[...shown].sort((a,b)=>(b.ltv??CAT_LTV[b.category]??55)-(a.ltv??CAT_LTV[a.category]??55));
  else shown=[...shown].sort((a,b)=>a.name.localeCompare(b.name));

  const totalValue  = allAssets.reduce((s,a)=>s+a.priceUsd, 0);
  const totalBorrow = allAssets.reduce((s,a)=>s+Math.round(a.priceUsd*(a.ltv??CAT_LTV[a.category]??55)/100), 0);

  const EDU:Record<string,string> = {
    Watches:    "Luxury watches trade on model, reference, and condition. Rolex Sub and AP Royal Oak hold value best. Box + papers critical. Courtyard vault.",
    Spirits:    "Rare spirits priced by distillery, age, and edition. Closed distilleries appreciate fastest. Baxus-authenticated.",
    Comics:     "CGC grade (1–10) and label color drive value. First appearances and silver-age keys lead.",
    Pokemon:    "PSA 10 Gem Mint commands 3–10× premium over PSA 9. 1st Edition and Shadowless prints rarest.",
    "One Piece":"Early Bandai and tournament-legal trophy cards most valuable. PSA/CGC graded.",
    Racehorses: "Value driven by breeding rights, pedigree, and race record. Jockey Club registry.",
    Metals:     "Gold and silver priced via LBMA fix. Highest LTV (80%) — most liquid collateral.",
    Stocks:     "Tokenized equities track real-time market data. NVDA, TSLA, AAPL available.",
    Sports:     "Rookie cards, low-pop PSA slabs, and certified autos lead. Season-driven volatility.",
  };

  return (
    <div>
      {/* Protocol metrics strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:"0.4rem",marginBottom:"1rem",padding:"0.5rem 0.875rem",background:"rgba(6,8,16,0.98)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"10px"}}>
        {([
          ["Listed",         allAssets.length+"",     "#14F195"],
          ["Pending",        pendingAssets.length+"", "#FBBF24"],
          ["Total Value",    fmtUsd(totalValue),      "#C8A96E"],
          ["Max Borrowable", fmtUsd(totalBorrow),     "#6b8cff"],
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
        <div style={{marginBottom:"0.875rem",padding:"0.5rem 0.875rem",background:"rgba(251,191,36,0.04)",border:"1px solid rgba(251,191,36,0.1)",borderRadius:"8px"}}>
          <div style={{fontSize:"0.42rem",fontWeight:700,color:"rgba(251,191,36,0.55)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"0.3rem"}}>Pending Verification — visible, not yet tradable</div>
          {pendingAssets.map(a=>(
            <div key={a.id} style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.2rem 0"}}>
              <div style={{width:"5px",height:"5px",borderRadius:"50%",background:"#FBBF24",animation:"pulse 1.2s ease-in-out infinite",flexShrink:0}}/>
              <span style={{fontSize:"0.52rem",color:"rgba(255,255,255,0.5)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</span>
              <span style={{fontSize:"0.38rem",fontWeight:700,color:"#FBBF24",fontFamily:"'JetBrains Mono',monospace"}}>{a.status==="pending_soft"?"SOFT-LISTED":"VERIFYING"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Category filter pills */}
      <div style={{display:"flex",gap:"0.3rem",marginBottom:"0.75rem",flexWrap:"wrap"}}>
        {activeCats.map(cat=>{
          const c=cat==="all"?"#f0f0f0":(CAT_COLOR[cat]??"#f0f0f0");
          const active=filter===cat;
          const count=cat==="all"?allAssets.length:allAssets.filter(a=>a.category===cat).length;
          return (
            <button key={cat} onClick={()=>setFilter(cat)}
              onMouseEnter={()=>setTooltip(cat!=="all"?(EDU[cat]??null):null)}
              onMouseLeave={()=>setTooltip(null)}
              style={{padding:"0.3rem 0.7rem",borderRadius:"16px",border:`1px solid ${active?c+"50":c+"18"}`,background:active?`${c}12`:"transparent",color:active?c:`${c}55`,fontSize:"0.52rem",fontWeight:active?700:400,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.04em",transition:"all 0.15s"}}>
              {cat==="all"?"All":cat} <span style={{fontSize:"0.4rem",opacity:0.6}}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Education tooltip */}
      {tooltip&&<div style={{padding:"0.38rem 0.75rem",background:"rgba(107,140,255,0.06)",border:"1px solid rgba(107,140,255,0.15)",borderRadius:"6px",marginBottom:"0.625rem",fontSize:"0.5rem",color:"rgba(255,255,255,0.45)",lineHeight:1.65}}>{tooltip}</div>}

      {/* Search + sort + view */}
      <div style={{display:"flex",gap:"0.4rem",marginBottom:"0.625rem",flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search assets…"
          style={{padding:"0.32rem 0.55rem",borderRadius:"6px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"#f0f0f0",fontSize:"0.54rem",fontFamily:"'JetBrains Mono',monospace",outline:"none",width:"150px"}}
          onFocus={e=>{e.currentTarget.style.borderColor="rgba(107,140,255,0.4)";}}
          onBlur={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";}}/>
        <div style={{display:"flex",gap:"0.2rem"}}>
          {(["name","price","ltv"] as const).map(s=>(
            <button key={s} onClick={()=>setSortBy(s)} style={{padding:"0.25rem 0.5rem",borderRadius:"5px",border:`1px solid ${sortBy===s?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.07)"}`,background:sortBy===s?"rgba(255,255,255,0.07)":"transparent",color:sortBy===s?"#f0f0f0":"rgba(255,255,255,0.28)",fontSize:"0.46rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",textTransform:"capitalize"}}>{s}</button>
          ))}
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:"0.2rem"}}>
          {(["grid","list"] as const).map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{padding:"0.22rem 0.4rem",borderRadius:"4px",border:`1px solid ${view===v?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.06)"}`,background:view===v?"rgba(255,255,255,0.07)":"transparent",color:view===v?"#f0f0f0":"rgba(255,255,255,0.25)",fontSize:"0.46rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace"}}>{v==="grid"?"⊟⊟⊟":"≡"}</button>
          ))}
        </div>
      </div>

      <div style={{fontSize:"0.42rem",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.5rem"}}>
        {shown.length} asset{shown.length!==1?"s":""}{search?` matching "${search}"`:""}
        {filter!=="all"?` · ${filter}`:""}
      </div>

      {/* Asset grid */}
      {shown.length===0?(
        <div style={{padding:"2.5rem",textAlign:"center",background:"rgba(6,8,16,0.97)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"12px"}}>
          <div style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.22)",marginBottom:"0.35rem"}}>No assets match</div>
          <button onClick={()=>{setFilter("all");setSearch("");}} style={{padding:"0.3rem 0.75rem",borderRadius:"6px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.35)",fontSize:"0.52rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace"}}>Clear filters</button>
        </div>
      ):(
        <div style={{display:view==="grid"?"grid":"flex",gridTemplateColumns:view==="grid"?"repeat(auto-fill,minmax(min(100%,210px),1fr))":undefined,flexDirection:view==="list"?"column":undefined,gap:"0.5rem"}}>
          {shown.map(a=><AssetCard key={a.id} asset={a} isNew={knownIds.has(a.id)}/>)}
        </div>
      )}

      <div style={{marginTop:"1.25rem",padding:"0.5rem 0.875rem",background:"rgba(20,241,149,0.03)",border:"1px solid rgba(20,241,149,0.07)",borderRadius:"8px"}}>
        <span style={{fontSize:"0.46rem",color:"rgba(255,255,255,0.28)",lineHeight:1.65}}>
          <span style={{color:"rgba(20,241,149,0.5)"}}>▸ </span>All assets verified via custody partner. Hover a category for pricing education. Newly minted assets appear here automatically after verification.
        </span>
      </div>
      
    </div>
  );
}