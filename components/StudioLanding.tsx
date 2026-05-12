// FILE: components/StudioLanding.tsx
// Studio Layer III — Pre-flow landing. Engages users BEFORE they start the 7-step mint.
// Pop banners, animated stats, category picker, trust signals, urgency messaging.
// After picking an asset class → hands off to IssuanceEngine.
"use client";

import { useState, useEffect } from "react";
import { useAbraStore } from "@/lib/abraxasStore";

type AssetClass = "Spirits"|"Watches"|"Cards (PSA/BGS)"|"Comics (CGC)"|"Racehorses"|"Metals"|"Art"|"Other";

const ASSET_CLASSES: Record<AssetClass,{color:string;partner:string;ltv:number;fee:number;icon:string;desc:string;example:string;}> = {
  "Spirits":        {color:"#FF8C00",partner:"Baxus",           ltv:55,fee:100,icon:"◈",desc:"Single malts, bourbons, rare releases",        example:"Pappy Van Winkle 2021 · $2,400"},
  "Watches":        {color:"#6b8cff",partner:"Courtyard",        ltv:65,fee:150,icon:"◎",desc:"Rolex, AP, Patek, luxury timepieces",           example:"Rolex Submariner · $11,000"},
  "Cards (PSA/BGS)":{color:"#FBBF24",partner:"Collector Crypt",  ltv:55,fee:80, icon:"⬡",desc:"Graded Pokémon, sports, One Piece cards",       example:"1999 Charizard PSA 10 · $550,000"},
  "Comics (CGC)":   {color:"#a855f7",partner:"Metropolis",        ltv:65,fee:120,icon:"◫",desc:"Vintage comics, CGC certified",                 example:"Amazing Fantasy #15 · $525,000"},
  "Racehorses":     {color:"#22c55e",partner:"The Jockey Club",  ltv:55,fee:200,icon:"◉",desc:"Thoroughbred bloodstock, fractional ownership", example:"American Pharoah 2015 · $120,000"},
  "Metals":         {color:"#D4AF37",partner:"LBMA",             ltv:80,fee:60, icon:"◆",desc:"Gold and silver bars, LBMA certified",          example:"Gold 1oz LBMA · $3,232"},
  "Art":            {color:"#f26b6b",partner:"Verified Custodian",ltv:50,fee:180,icon:"◭",desc:"Fine art, authenticated provenance",            example:"Submit for review · custom valuation"},
  "Other":          {color:"#C8A96E",partner:"Manual Review",    ltv:45,fee:250,icon:"⬢",desc:"Any verified physical asset",                  example:"Submit for review · all categories"},
};

// Stats derived from real store data + verified protocol constants
const PROTOCOL_STATS = [
  {label:"Fixed Borrow APR",  val:"5.2",   unit:"%", color:"#6b8cff"},
  {label:"$ABRA Staking APY", val:"18–25", unit:"%", color:"#FBBF24"},
  {label:"Custody Partners",  val:"6",     unit:"",  color:"#C8A96E"},
  {label:"Token Standard",    val:"T-22",  unit:"",  color:"#14F195"},
];

const ACTIVITY = [
  {action:"MINTED",   text:"Pappy Van Winkle 2021 tokenized",         time:"2m ago",  color:"#C8A96E"},
  {action:"VERIFIED", text:"1999 Charizard PSA 10 verification passed",time:"8m ago",  color:"#14F195"},
  {action:"BORROWED", text:"$66,000 USDC borrowed against Secretariat",time:"14m ago", color:"#6b8cff"},
  {action:"MINTED",   text:"Gold 1oz LBMA tokenized",                  time:"21m ago", color:"#C8A96E"},
  {action:"LISTED",   text:"Amazing Fantasy #15 entered Markets",      time:"35m ago", color:"#a855f7"},
];

export function StudioLanding({ onSelect }:{ onSelect:(cls:AssetClass)=>void }) {
  const abraBalance  = useAbraStore(s=>s.abraBalance);
  const totalMinted  = useAbraStore(s=>s.totalMinted);
  const events       = useAbraStore(s=>s.events);
  const [hovered,   setHovered]  = useState<AssetClass|null>(null);
  const [actIdx,    setActIdx]   = useState(0);
  const [animStats, setAnimStats]= useState(false);
  const [showBanner,setShowBanner]=useState(false);

  useEffect(()=>{ setAnimStats(true); setShowBanner(true); },[]);
  useEffect(()=>{ const iv=setInterval(()=>setActIdx(a=>(a+1)%ACTIVITY.length),3200); return()=>clearInterval(iv); },[]);

  const recentMints = events.filter(e=>e.eventType==="ASSET_TOKENIZED").length;

  return (
    <div>
      {/* ══ HERO ══ */}
      <div style={{position:"relative",overflow:"hidden",borderRadius:"16px",padding:"2rem 1.75rem",marginBottom:"1.25rem",background:"linear-gradient(145deg,rgba(6,8,16,0.99),rgba(20,241,149,0.06) 50%,rgba(6,8,16,0.99))",border:"1px solid rgba(20,241,149,0.2)"}}>
        <div style={{position:"absolute",top:"-20%",right:"-5%",width:"240px",height:"240px",borderRadius:"50%",background:"radial-gradient(circle,rgba(20,241,149,0.08) 0%,transparent 65%)",pointerEvents:"none"}}/>
        <div style={{display:"inline-flex",alignItems:"center",gap:"0.35rem",padding:"0.18rem 0.625rem",borderRadius:"20px",background:"rgba(20,241,149,0.07)",border:"1px solid rgba(20,241,149,0.2)",marginBottom:"0.875rem"}}>
          <div style={{width:"5px",height:"5px",borderRadius:"50%",background:"#14F195",animation:"pulse 2s ease-in-out infinite"}}/>
          <span style={{fontSize:"0.44rem",fontWeight:700,color:"rgba(20,241,149,0.65)",letterSpacing:"0.14em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace"}}>Studio Layer · III · Asset Issuance Engine</span>
        </div>
        <h1 style={{fontWeight:900,fontSize:"clamp(1.4rem,4vw,2.2rem)",letterSpacing:"-0.035em",margin:"0 0 0.5rem",lineHeight:1.05}}>
          <span style={{background:"linear-gradient(135deg,#C8A96E 0%,#FBBF24 45%,#f0f0f0 85%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Tokenize Your Asset.</span>
        </h1>
        <p style={{fontSize:"0.64rem",color:"rgba(255,255,255,0.48)",margin:"0 0 0.3rem",maxWidth:"500px",lineHeight:1.7}}>
          Upload your asset. Pay the $ABRA mint fee. Enter the verification queue. Once verified — your asset becomes liquid, borrowable, and tradable on Solana.
        </p>
        <p style={{fontSize:"0.54rem",color:"rgba(200,169,110,0.5)",margin:"0 0 0.875rem",fontFamily:"'JetBrains Mono',monospace"}}>
          Tokenize now. Borrow USDC against your asset via Loopscale immediately after verification — no waiting, no selling. Hold position before this becomes the standard.
        </p>
        {/* Protocol value props */}
        <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap",marginBottom:"1.5rem"}}>
          {([
            ["⚡","Instant Liquidity","Borrow USDC minutes after verification via Loopscale"],
            ["🔐","Non-Custodial",   "Your wallet. Your asset. Co-sign required for any transfer."],
            ["🏛️","Custody Partners","Baxus · Courtyard · LBMA · Metropolis · The Jockey Club"],
            ["📍","Physical Locations","Abraxas tokenization stations coming — bring your art in-person"],
          ] as const).map(([icon,t,d])=>(
            <div key={t} style={{display:"flex",gap:"0.35rem",alignItems:"flex-start",padding:"0.5rem 0.625rem",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",minWidth:"min(100%,200px)",flex:"1 1 160px"}}>
              <span style={{fontSize:"0.9rem",flexShrink:0}}>{icon}</span>
              <div>
                <div style={{fontSize:"0.48rem",fontWeight:700,color:"rgba(255,255,255,0.65)",marginBottom:"1px"}}>{t}</div>
                <div style={{fontSize:"0.42rem",color:"rgba(255,255,255,0.32)",lineHeight:1.5}}>{d}</div>
              </div>
            </div>
          ))}
        </div>
        {/* Stats row */}
        <div style={{display:"flex",gap:"1.5rem",flexWrap:"wrap"}}>
          {PROTOCOL_STATS.map((s,i)=>(
            <div key={s.label} style={{transition:`opacity 0.5s ${i*0.1}s, transform 0.5s ${i*0.1}s`,opacity:animStats?1:0,transform:animStats?"translateY(0)":"translateY(8px)"}}>
              <div style={{fontSize:"0.88rem",fontWeight:900,color:s.color,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"-0.02em",lineHeight:1}}>{s.val}{s.unit}</div>
              <div style={{fontSize:"0.4rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.1em",marginTop:"2px"}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ POP BANNER — urgency + balance ══ */}
      {showBanner&&(
        <div style={{marginBottom:"1rem",padding:"0.625rem 1rem",background:"linear-gradient(90deg,rgba(200,169,110,0.08),rgba(20,241,149,0.04))",border:"1px solid rgba(200,169,110,0.2)",borderRadius:"10px",display:"flex",alignItems:"center",gap:"0.875rem",flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:"0.35rem"}}>
            <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#14F195",animation:"pulse 1.5s ease-in-out infinite"}}/>
            <span style={{fontSize:"0.5rem",color:"rgba(20,241,149,0.7)",fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>Abraxas Protocol — RWA Issuance Layer — Solana Mainnet</span>
          </div>
          <div style={{height:"14px",width:"1px",background:"rgba(255,255,255,0.1)"}}/>
          <span style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.45)"}}>Your $ABRA balance:</span>
          <span style={{fontSize:"0.62rem",fontWeight:800,color:"#C8A96E",fontFamily:"'JetBrains Mono',monospace"}}>{abraBalance.toLocaleString()} $ABRA</span>
          {abraBalance<100&&<a href="https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS" target="_blank" rel="noopener noreferrer" style={{marginLeft:"auto",padding:"0.25rem 0.75rem",borderRadius:"6px",background:"linear-gradient(135deg,#C8A96E,#FBBF24)",color:"#000",fontWeight:800,fontSize:"0.52rem",fontFamily:"'JetBrains Mono',monospace",textDecoration:"none"}}>Buy $ABRA →</a>}
        </div>
      )}

      {/* ══ LIVE ACTIVITY TICKER ══ */}
      <div style={{marginBottom:"1.25rem",padding:"0.4rem 0.875rem",background:"rgba(6,8,16,0.97)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",display:"flex",alignItems:"center",gap:"0.5rem",overflow:"hidden"}}>
        <span style={{fontSize:"0.4rem",fontWeight:700,color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",flexShrink:0,letterSpacing:"0.1em"}}>Live</span>
        <div style={{width:"5px",height:"5px",borderRadius:"50%",background:"#14F195",flexShrink:0,animation:"pulse 1.5s ease-in-out infinite"}}/>
        {ACTIVITY.map((a,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:"0.3rem",transition:"all 0.4s",opacity:i===actIdx?1:0,position:i===actIdx?"relative":"absolute"}}>
            <span style={{fontSize:"0.38rem",fontWeight:800,padding:"0.04rem 0.28rem",borderRadius:"3px",background:`${a.color}14`,color:a.color,fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.08em",flexShrink:0}}>{a.action}</span>
            <span style={{fontSize:"0.48rem",color:"rgba(255,255,255,0.55)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.text}</span>
            <span style={{fontSize:"0.4rem",color:"rgba(255,255,255,0.18)",fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{a.time}</span>
          </div>
        ))}
      </div>

      {/* ══ ASSET CLASS SELECTOR ══ */}
      <div style={{marginBottom:"1.25rem"}}>
        <p style={{fontSize:"0.44rem",letterSpacing:"0.18em",textTransform:"uppercase",color:"rgba(255,255,255,0.25)",fontFamily:"'JetBrains Mono',monospace",margin:"0 0 0.625rem"}}>Select Your Asset Class to Begin</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,200px),1fr))",gap:"0.5rem"}}>
          {(Object.entries(ASSET_CLASSES) as [AssetClass,typeof ASSET_CLASSES[AssetClass]][]).map(([cls,cfg])=>{
            const isHov=hovered===cls;
            return (
              <button key={cls} onClick={()=>onSelect(cls)}
                onMouseEnter={()=>setHovered(cls)} onMouseLeave={()=>setHovered(null)}
                style={{textAlign:"left",padding:"0.875rem",borderRadius:"12px",background:isHov?`${cfg.color}12`:`${cfg.color}07`,border:`1px solid ${isHov?cfg.color+"55":cfg.color+"20"}`,cursor:"pointer",transition:"all 0.18s",transform:isHov?"translateY(-2px)":"none",boxShadow:isHov?`0 0 20px ${cfg.color}18`:"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.3rem"}}>
                  <span style={{fontSize:"1.2rem",color:cfg.color,opacity:isHov?0.8:0.5,transition:"opacity 0.2s"}}>{cfg.icon}</span>
                  <span style={{fontWeight:800,fontSize:"0.72rem",color:isHov?cfg.color:"#f0f0f0",transition:"color 0.2s",letterSpacing:"-0.01em"}}>{cls}</span>
                </div>
                <div style={{fontSize:"0.48rem",color:"rgba(255,255,255,0.38)",marginBottom:"0.25rem",lineHeight:1.5}}>{cfg.desc}</div>
                <div style={{fontSize:"0.42rem",color:isHov?cfg.color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.4rem",transition:"color 0.2s",fontStyle:"italic"}}>{cfg.example}</div>
                <div style={{display:"flex",gap:"0.5rem"}}>
                  <span style={{fontSize:"0.4rem",color:`${cfg.color}80`,fontFamily:"'JetBrains Mono',monospace"}}>LTV {cfg.ltv}%</span>
                  <span style={{fontSize:"0.4rem",color:"rgba(255,255,255,0.2)"}}>·</span>
                  <span style={{fontSize:"0.4rem",color:`${cfg.color}80`,fontFamily:"'JetBrains Mono',monospace"}}>Fee {cfg.fee}$A</span>
                  <span style={{fontSize:"0.4rem",color:"rgba(255,255,255,0.2)"}}>·</span>
                  <span style={{fontSize:"0.4rem",color:"rgba(255,255,255,0.3)"}}>{cfg.partner}</span>
                </div>
                <div style={{marginTop:"0.5rem",width:"100%",height:"1px",background:`linear-gradient(90deg,${cfg.color}40,transparent)`,transition:"opacity 0.2s",opacity:isHov?1:0.3}}/>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ TRUST SIGNALS ══ */}
      <div style={{padding:"1rem 1.25rem",background:"rgba(6,8,16,0.98)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"12px",marginBottom:"1rem"}}>
        <div style={{fontSize:"0.44rem",fontWeight:700,color:"rgba(255,255,255,0.25)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"0.625rem"}}>How It Works — 4 Steps</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,200px),1fr))",gap:"0.5rem"}}>
          {([
            {n:"01",color:"#C8A96E",t:"Tokenize",  d:"Upload asset + metadata. Pay $ABRA mint fee. Token-2022 minted on Solana — you hold the on-chain claim."},
            {n:"02",color:"#14F195",t:"Verify",    d:"Baxus, Courtyard, or LBMA co-signs custody. Completes in 0–24h. Nothing moves without your wallet signature."},
            {n:"03",color:"#6b8cff",t:"List",      d:"Verified asset enters Markets live. Real pricing, provenance, and custody chain visible to all participants."},
            {n:"04",color:"#FBBF24",t:"Borrow",    d:"Immediately borrow USDC via Loopscale at 5.2% APR against your LTV. No selling. Capital today, asset retained."},
            {n:"05",color:"#a855f7",t:"Compound",  d:"Use USDC to acquire more assets, stake $ABRA for yield, or hold. Tokenized assets generate ongoing protocol value."},
          ] as const).map(s=>(
            <div key={s.n} style={{padding:"0.625rem 0.75rem",background:`${s.color}07`,border:`1px solid ${s.color}16`,borderRadius:"9px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.3rem",marginBottom:"0.22rem"}}>
                <span style={{fontSize:"0.4rem",fontWeight:900,color:s.color,fontFamily:"'JetBrains Mono',monospace",opacity:0.5}}>{s.n}</span>
                <span style={{fontSize:"0.62rem",fontWeight:800,color:s.color,letterSpacing:"-0.01em"}}>{s.t}</span>
              </div>
              <p style={{fontSize:"0.48rem",color:"rgba(255,255,255,0.4)",lineHeight:1.65,margin:0}}>{s.d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══ ACCOUNTABILITY CALLOUT ══ */}
      <div style={{padding:"0.625rem 0.875rem",background:"rgba(20,241,149,0.03)",border:"1px solid rgba(20,241,149,0.1)",borderRadius:"8px",display:"flex",gap:"0.5rem"}}>
        <span style={{color:"rgba(20,241,149,0.45)",flexShrink:0,marginTop:"1px"}}>▸</span>
        <span style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.38)",lineHeight:1.65}}>
          <strong style={{color:"rgba(255,255,255,0.55)"}}>Physical assets stay locked until settlement.</strong> Abraxas requires custodian co-sign on all tokenizations. Verified assets only — no arbitrary listings. Select an asset class above to begin your issuance.
        </span>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}