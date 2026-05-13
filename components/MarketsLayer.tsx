// FILE: components/MarketsLayer.tsx
// SINGLE SOURCE OF TRUTH: inventory.json + Zustand minted assets.
// No Supabase. No API calls. No real-time. Deterministic render.
"use client";
"use client";

import { useState, useEffect } from "react";
import { useAbraStore, type AbraAsset } from "@/lib/abraxasStore";
import rawInventory from "@/data/inventory.json";

interface InvAsset {
  id:string; name:string; category:string; priceUsd:number;
  imagePath?:string; ltv?:number; custodyPartner?:string;
  description?:string;
}

const CAT_COLOR: Record<string,string> = {
  Spirits:"#FF8C00", Watches:"#6b8cff", "Cards (PSA/BGS)":"#FBBF24",
  "Comics (CGC)":"#a855f7", Racehorses:"#22c55e", Metals:"#D4AF37",
  Pokemon:"#FBBF24", "One Piece":"#f26b6b", Sports:"#14F195",
  Stocks:"#6b8cff", Art:"#f26b6b", Other:"#C8A96E",
};
const fmtUsd = (v:number) => v>=1000?`$${(v/1000).toFixed(0)}K`:`$${v.toFixed(0)}`;

function AssetCard({ asset }: { asset: InvAsset & {isNew?:boolean} }) {
  const [imgErr, setImgErr] = useState(false);
  const color = CAT_COLOR[asset.category] ?? "#C8A96E";
  return (
    <div style={{ background:`${color}08`, border:`1px solid ${color}${asset.isNew?"55":"18"}`,
                  borderRadius:"12px", overflow:"hidden", transition:"all 0.2s",
                  boxShadow: asset.isNew?`0 0 16px ${color}20`:"none" }}>
      {/* Image */}
      {asset.imagePath && !imgErr ? (
        <div style={{ height:"110px", background:"rgba(6,8,16,0.98)", display:"flex",
                      alignItems:"center", justifyContent:"center", padding:"0.35rem" }}>
          <img src={asset.imagePath} alt={asset.name} onError={()=>setImgErr(true)}
               style={{ maxHeight:"104px", maxWidth:"100%", objectFit:"contain" }} loading="lazy"/>
        </div>
      ) : (
        <div style={{ height:"80px", background:`${color}0a`, display:"flex",
                      alignItems:"center", justifyContent:"center",
                      fontSize:"1.5rem", color, opacity:0.5 }}>◈</div>
      )}
      {/* Info */}
      <div style={{ padding:"0.625rem 0.75rem" }}>
        {asset.isNew && (
          <div style={{ fontSize:"0.38rem", fontWeight:800, color:"#14F195",
                        fontFamily:"'JetBrains Mono',monospace", marginBottom:"3px" }}>
            ✓ JUST MINTED
          </div>
        )}
        <div style={{ fontSize:"0.44rem", fontWeight:700, color, fontFamily:"'JetBrains Mono',monospace",
                      textTransform:"uppercase", marginBottom:"2px" }}>{asset.category}</div>
        <div style={{ fontWeight:800, fontSize:"0.64rem", color:"#f0f0f0",
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                      marginBottom:"4px" }}>{asset.name}</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:"0.7rem", fontWeight:900, color:"#f0f0f0",
                         fontFamily:"'JetBrains Mono',monospace" }}>{fmtUsd(asset.priceUsd)}</span>
          {asset.ltv && (
            <span style={{ fontSize:"0.44rem", color:"rgba(20,241,149,0.6)",
                           fontFamily:"'JetBrains Mono',monospace" }}>
              Borrow {asset.ltv}% LTV
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function MarketsLayer({ onTokenize }: { onTokenize?: () => void }) {
  const [filter,    setFilter]    = useState("all");
  const [mounted,   setMounted]   = useState(false);
  const mintedAssets = useAbraStore(s => s.assets);

  useEffect(() => { setMounted(true); }, []);

  // Static inventory assets
  const inventory: InvAsset[] = ((rawInventory as {assets?:InvAsset[]}).assets ?? []);

  // Minted assets (from Zustand) — shown first as new
  const mintedCards: (InvAsset & {isNew:boolean})[] = mounted
    ? mintedAssets.map(a => ({
        id: a.id, name: a.name, category: a.assetClass,
        priceUsd: a.estimatedUsd, imagePath: a.imagePreview,
        ltv: a.ltv, custodyPartner: a.custodyPartner, isNew: true,
      }))
    : [];

  // Dedup: hide inventory items that have same id as minted
  const mintedIds = new Set(mintedCards.map(a => a.id));
  const invCards  = inventory.filter(a => !mintedIds.has(a.id)).map(a => ({ ...a, isNew:false }));

  const allCards = [...mintedCards, ...invCards];

  // Categories for filter
  const cats = ["all", ...Array.from(new Set(allCards.map(a => a.category))).sort()];

  const shown = filter === "all" ? allCards : allCards.filter(a => a.category === filter);

  return (
    <div style={{ maxWidth:"900px", margin:"0 auto" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    marginBottom:"1rem", flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <h2 style={{ fontWeight:900, fontSize:"1.1rem", color:"#f0f0f0", margin:"0 0 2px",
                       letterSpacing:"-0.02em" }}>Markets</h2>
          <p style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.35)", margin:0 }}>
            {shown.length} assets · {mintedCards.length} newly minted
          </p>
        </div>
        <button onClick={onTokenize} style={{
          padding:"0.5rem 1rem", borderRadius:"8px", border:"none", cursor:"pointer",
          background:"linear-gradient(135deg,#C8A96E,#FBBF24)", color:"#000",
          fontWeight:800, fontSize:"0.6rem", fontFamily:"'JetBrains Mono',monospace",
        }}>+ Tokenize Asset</button>
      </div>

      {/* Category filter */}
      <div style={{ display:"flex", gap:"0.3rem", flexWrap:"wrap", marginBottom:"1rem" }}>
        {cats.map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{
            padding:"0.28rem 0.625rem", borderRadius:"6px", cursor:"pointer",
            border:`1px solid ${filter===c?"rgba(200,169,110,0.5)":"rgba(255,255,255,0.08)"}`,
            background: filter===c?"rgba(200,169,110,0.1)":"rgba(255,255,255,0.02)",
            color: filter===c?"#C8A96E":"rgba(255,255,255,0.4)",
            fontSize:"0.48rem", fontWeight:filter===c?700:400, fontFamily:"'JetBrains Mono',monospace",
          }}>{c==="all"?"All":c}</button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display:"grid",
                    gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,200px),1fr))",
                    gap:"0.625rem" }}>
        {shown.map(a => <AssetCard key={a.id} asset={a} />)}
      </div>
    </div>
  );
}