// FILE: components/LoopscaleBorrowSimulator.tsx
// Capital tab — "Borrow Against Your RWAs" powered by Loopscale.
// Shows user's tokenized assets with max borrow, clean handoff to Loopscale app.
"use client";

import { useState } from "react";
import { useAbraStore } from "@/lib/abraxasStore";

const CAT_COLOR: Record<string,string> = {
  Spirits:"#FF8C00",Watches:"#6b8cff","Cards (PSA/BGS)":"#FBBF24",
  "Comics (CGC)":"#a855f7",Racehorses:"#22c55e",Metals:"#D4AF37",
  Art:"#f26b6b",Other:"#C8A96E",
};
function fmtUsd(v:number):string{return v>=1_000_000?`$${(v/1_000_000).toFixed(2)}M`:v>=1_000?`$${(v/1_000).toFixed(1)}K`:`$${v.toFixed(0)}`;}

export function LoopscaleBorrowSimulator() {
  const storeAssets   = useAbraStore(s=>s.assets);
  const [selected,    setSelected]  = useState<string|null>(null);

  // Show listed + verified assets that are borrow-eligible
  const eligible = storeAssets.filter(a =>
    a.status === "listed" || a.status === "collateral_eligible" || a.status === "verified"
  );

  const selectedAsset = eligible.find(a=>a.id===selected);
  const totalBorrowable = eligible.reduce((s,a)=>s+Math.round(a.estimatedUsd*a.ltv/100),0);

  function openLoopscale() {
    window.open("https://app.loopscale.com", "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{marginBottom:"1.5rem"}}>
      {/* Header */}
      <div style={{marginBottom:"1.25rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.3rem"}}>
          <h2 style={{fontWeight:900,fontSize:"1.1rem",color:"#f0f0f0",margin:0,letterSpacing:"-0.02em"}}>Borrow Against Your RWAs</h2>
          <div style={{padding:"0.15rem 0.5rem",borderRadius:"4px",background:"rgba(107,140,255,0.1)",border:"1px solid rgba(107,140,255,0.25)"}}>
            <span style={{fontSize:"0.42rem",fontWeight:700,color:"#6b8cff",fontFamily:"'JetBrains Mono',monospace"}}>Powered by Loopscale</span>
          </div>
        </div>
        <p style={{fontSize:"0.56rem",color:"rgba(255,255,255,0.4)",margin:0,lineHeight:1.65}}>
          Your verified tokenized assets are eligible for USDC borrowing via Loopscale — no selling required. Select an asset to see your borrow capacity, then continue in the Loopscale app.
        </p>
      </div>

      {/* Portfolio summary strip */}
      {eligible.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"0.4rem",marginBottom:"1.25rem",padding:"0.625rem 0.875rem",background:"rgba(6,8,16,0.98)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"10px"}}>
          {([
            ["Eligible Assets", eligible.length.toString(), "#14F195"],
            ["Total Borrowable", fmtUsd(totalBorrowable), "#C8A96E"],
            ["Fixed APR", "5.2%", "#6b8cff"],
            ["Settlement", "USDC", "#f0f0f0"],
          ] as [string,string,string][]).map(([l,v,c])=>(
            <div key={l} style={{textAlign:"center"}}>
              <div style={{fontSize:"0.72rem",fontWeight:900,color:c,fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>{v}</div>
              <div style={{fontSize:"0.38rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.06em",marginTop:"2px"}}>{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Asset cards */}
      {eligible.length === 0 ? (
        <div style={{padding:"2rem",textAlign:"center",background:"rgba(6,8,16,0.97)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"12px",marginBottom:"1rem"}}>
          <div style={{fontSize:"1.5rem",marginBottom:"0.5rem",opacity:0.4}}>⬢</div>
          <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,0.35)",marginBottom:"0.25rem"}}>No eligible assets yet</div>
          <div style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.22)"}}>Tokenize an asset in Studio — once verified, it becomes borrow-eligible here</div>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,220px),1fr))",gap:"0.625rem",marginBottom:"1.25rem"}}>
          {eligible.map(asset => {
            const c     = CAT_COLOR[asset.assetClass] ?? "#C8A96E";
            const borrow= Math.round(asset.estimatedUsd * asset.ltv / 100);
            const isSel = selected === asset.id;
            return (
              <div key={asset.id} onClick={()=>setSelected(isSel?null:asset.id)}
                style={{background:isSel?`${c}12`:`${c}07`,border:`1px solid ${isSel?c+"55":c+"22"}`,borderRadius:"12px",padding:"0.875rem",cursor:"pointer",transition:"all 0.18s",transform:isSel?"translateY(-2px)":"none",boxShadow:isSel?`0 0 20px ${c}18`:"none"}}>
                {/* Image + category */}
                {asset.imagePreview ? (
                  <img src={asset.imagePreview} alt={asset.name} style={{width:"100%",height:"90px",objectFit:"contain",borderRadius:"8px",background:"rgba(6,8,16,0.98)",marginBottom:"0.5rem"}}/>
                ) : (
                  <div style={{width:"100%",height:"72px",borderRadius:"8px",background:`${c}0a`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem",color:c,opacity:0.5,marginBottom:"0.5rem"}}>◈</div>
                )}
                <div style={{display:"flex",alignItems:"center",gap:"0.3rem",marginBottom:"0.2rem"}}>
                  <span style={{fontSize:"0.4rem",fontWeight:800,padding:"0.05rem 0.28rem",borderRadius:"6px",background:`${c}14`,border:`1px solid ${c}30`,color:c,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase"}}>{asset.assetClass}</span>
                  <span style={{marginLeft:"auto",fontSize:"0.36rem",color:"rgba(20,241,149,0.55)",fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>✓ ELIGIBLE</span>
                </div>
                <div style={{fontWeight:800,fontSize:"0.66rem",color:"#f0f0f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:"2px"}}>{asset.name}</div>
                <div style={{fontSize:"0.7rem",fontWeight:900,color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace",marginBottom:"2px"}}>{fmtUsd(asset.estimatedUsd)}</div>
                <div style={{fontSize:"0.48rem",color:isSel?"#14F195":"rgba(20,241,149,0.5)",fontFamily:"'JetBrains Mono',monospace",fontWeight:isSel?700:400}}>Up to {fmtUsd(borrow)} USDC at {asset.ltv}% LTV</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected asset detail */}
      {selectedAsset && (
        <div style={{padding:"1rem",background:"rgba(107,140,255,0.07)",border:"1px solid rgba(107,140,255,0.2)",borderRadius:"12px",marginBottom:"1rem"}}>
          <div style={{fontSize:"0.44rem",fontWeight:700,color:"rgba(107,140,255,0.6)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"0.5rem"}}>Borrow Preview — {selectedAsset.name}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:"0.5rem",marginBottom:"0.625rem"}}>
            {([
              ["Asset Value",    fmtUsd(selectedAsset.estimatedUsd),                                       "#f0f0f0"],
              ["Max Borrow",     `${fmtUsd(Math.round(selectedAsset.estimatedUsd*selectedAsset.ltv/100))} USDC`, "#14F195"],
              ["Fixed APR",      "5.2%",                                                                   "#14F195"],
              ["LTV Cap",        `${selectedAsset.ltv}%`,                                                  "#6b8cff"],
            ] as [string,string,string][]).map(([l,v,c])=>(
              <div key={l} style={{padding:"0.35rem 0.5rem",background:"rgba(6,8,16,0.97)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"6px",textAlign:"center"}}>
                <div style={{fontSize:"0.62rem",fontWeight:900,color:c,fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>{v}</div>
                <div style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",marginTop:"2px"}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <button onClick={openLoopscale} style={{width:"100%",padding:"1rem",borderRadius:"12px",border:"none",fontWeight:900,fontSize:"0.82rem",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em",cursor:"pointer",background:"linear-gradient(135deg,#6b8cff,#14F195)",color:"#000",boxShadow:"0 0 32px rgba(107,140,255,0.35)",marginBottom:"0.625rem",transition:"all 0.2s"}}>
        Continue in Loopscale App →
      </button>
      <p style={{fontSize:"0.44rem",color:"rgba(255,255,255,0.25)",textAlign:"center",margin:0,lineHeight:1.6}}>
        Connect your wallet in the Loopscale app to execute the borrow. LTVs and rates powered by Loopscale markets. Your Abraxas tokenized assets are automatically recognized.
      </p>
    </div>
  );
}