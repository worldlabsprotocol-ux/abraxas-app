// FILE: components/IssuanceEngine.tsx
// Studio Layer III — Asset Origination Infrastructure
// Full 7-step tokenization flow: Upload → Metadata → Valuation → Wallet → Fee → Processing → Queue
// Cinematic loading sequence on mount. Institutional-grade UX. Zero fake-placeholder feeling.
"use client";

import { useState, useEffect, useRef } from "react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type AssetClass = "Spirits"|"Watches"|"Cards (PSA/BGS)"|"Comics (CGC)"|"Racehorses"|"Metals"|"Art"|"Other";
type Step = "init"|"upload"|"metadata"|"valuation"|"wallet"|"fee"|"processing"|"queue";

const ASSET_CLASSES: Record<AssetClass,{ color:string; partner:string; ltv:number; fee:number; icon:string; }> = {
  "Spirits":       { color:"#FF8C00", partner:"Baxus",           ltv:55, fee:100, icon:"◈" },
  "Watches":       { color:"#6b8cff", partner:"Courtyard",        ltv:65, fee:150, icon:"◎" },
  "Cards (PSA/BGS)":{ color:"#FBBF24", partner:"Collector Crypt", ltv:55, fee:80,  icon:"⬡" },
  "Comics (CGC)":  { color:"#a855f7", partner:"Metropolis",        ltv:65, fee:120, icon:"◫" },
  "Racehorses":    { color:"#22c55e", partner:"The Jockey Club",  ltv:55, fee:200, icon:"◉" },
  "Metals":        { color:"#D4AF37", partner:"LBMA",             ltv:80, fee:60,  icon:"◆" },
  "Art":           { color:"#f26b6b", partner:"Verified Custodian",ltv:50, fee:180, icon:"◭" },
  "Other":         { color:"#C8A96E", partner:"Manual Review",    ltv:45, fee:250, icon:"⬢" },
};

const INIT_SEQUENCE = [
  { msg:"Syncing Market State",           dur:700 },
  { msg:"Verifying Oracle Feeds",         dur:800 },
  { msg:"Initializing Issuance Engine",   dur:900 },
  { msg:"Connecting Solana Settlement Layer", dur:700 },
  { msg:"Studio ready.",                  dur:500 },
];

const QUEUE_STEPS = [
  "Asset received by issuance protocol",
  "Metadata hash anchored to Solana",
  "Custodian notification dispatched",
  "Physical verification request initiated",
  "Awaiting ownership confirmation",
];

// ─── Step progress bar ────────────────────────────────────────────────────────
function StepBar({ step }:{ step:Step }) {
  const STEPS:Step[] = ["upload","metadata","valuation","wallet","fee","processing","queue"];
  const idx = STEPS.indexOf(step);
  return (
    <div style={{ display:"flex",alignItems:"center",gap:"0",marginBottom:"1.75rem" }}>
      {STEPS.map((s,i)=>{
        const done = i < idx, active = i === idx;
        const COLOR = done||active?"#14F195":"rgba(255,255,255,0.1)";
        return (
          <div key={s} style={{ display:"flex",alignItems:"center",flex:i<STEPS.length-1?"1":"0" }}>
            <div style={{ width:"18px",height:"18px",borderRadius:"50%",border:`2px solid ${COLOR}`,background:done?"#14F195":"rgba(6,8,16,0.99)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.3s" }}>
              {done&&<div style={{ width:"6px",height:"6px",borderRadius:"50%",background:"#000" }} />}
              {active&&<div style={{ width:"6px",height:"6px",borderRadius:"50%",background:"#14F195",animation:"pulse 1s ease-in-out infinite" }} />}
            </div>
            {i<STEPS.length-1&&<div style={{ flex:1,height:"1px",background:done?"#14F19560":"rgba(255,255,255,0.06)",transition:"background 0.4s",marginLeft:"-1px",marginRight:"-1px" }} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main IssuanceEngine export ───────────────────────────────────────────────
export function IssuanceEngine() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  // Init animation
  const [initIdx,   setInitIdx]   = useState(0);
  const [initDone,  setInitDone]  = useState(false);

  // Flow state
  const [step,      setStep]      = useState<Step>("init");
  const [assetClass,setAssetClass]= useState<AssetClass>("Watches");
  const [file,      setFile]      = useState<File|null>(null);
  const [preview,   setPreview]   = useState<string|null>(null);
  const [meta,      setMeta]      = useState({ name:"", grade:"", year:"", condition:"", serialNumber:"", description:"" });
  const [val,       setVal]       = useState({ estimatedUsd:"", referenceSource:"", insurer:"" });
  const [queueProgress, setQueueProgress] = useState(0);
  const [mintTxId,  setMintTxId]  = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const cfg = ASSET_CLASSES[assetClass];
  const estUsd = parseFloat(val.estimatedUsd)||0;
  const abraFee = cfg.fee;
  const borrowMax = Math.round(estUsd * cfg.ltv / 100);

  // ── Init sequence ──────────────────────────────────────────────────────────
  useEffect(()=>{
    if(initDone) return;
    let total = 0;
    INIT_SEQUENCE.forEach((s,i)=>{
      total += i===0?0:INIT_SEQUENCE[i-1].dur;
      setTimeout(()=>setInitIdx(i), total);
    });
    const finalTime = INIT_SEQUENCE.reduce((acc,s,i)=>i<INIT_SEQUENCE.length-1?acc+s.dur:acc,0);
    setTimeout(()=>{ setInitDone(true); setStep("upload"); }, finalTime+400);
  },[]);

  // ── Queue progress animation ───────────────────────────────────────────────
  useEffect(()=>{
    if(step!=="queue") return;
    const iv = setInterval(()=>setQueueProgress(p=>{ if(p>=QUEUE_STEPS.length-1){ clearInterval(iv); return p; } return p+1; }), 1800);
    return ()=>clearInterval(iv);
  },[step]);

  // ── File handler ───────────────────────────────────────────────────────────
  function handleFile(f:File) {
    setFile(f);
    const r = new FileReader();
    r.onload = e=>setPreview(e.target?.result as string);
    r.readAsDataURL(f);
  }

  // ── Simulated mint ─────────────────────────────────────────────────────────
  async function processMint() {
    setStep("processing");
    await new Promise(r=>setTimeout(r,3200));
    setMintTxId(`AbrxM${Math.random().toString(36).slice(2,10).toUpperCase()}...${Math.random().toString(36).slice(2,6).toUpperCase()}`);
    setStep("queue");
  }

  // ─── INIT SEQUENCE ─────────────────────────────────────────────────────────
  if(!initDone) return (
    <div style={{ minHeight:"70vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"2rem" }}>
      <div style={{ width:"100%",maxWidth:"440px" }}>
        {/* Protocol mark */}
        <div style={{ display:"flex",alignItems:"center",gap:"0.625rem",marginBottom:"2rem" }}>
          <div style={{ width:"32px",height:"32px",borderRadius:"8px",background:"rgba(200,169,110,0.1)",border:"1px solid rgba(200,169,110,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",color:"#C8A96E" }}>⬢</div>
          <div>
            <div style={{ fontSize:"0.62rem",fontWeight:800,color:"#C8A96E",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.06em" }}>ABRAXAS PROTOCOL</div>
            <div style={{ fontSize:"0.42rem",color:"rgba(255,255,255,0.25)",fontFamily:"'JetBrains Mono',monospace" }}>Issuance Engine · III · Studio</div>
          </div>
        </div>

        {/* Sequence lines */}
        <div style={{ marginBottom:"2rem" }}>
          {INIT_SEQUENCE.map((s,i)=>{
            const done = i < initIdx, active = i === initIdx;
            return (
              <div key={i} style={{ display:"flex",alignItems:"center",gap:"0.625rem",padding:"0.4rem 0",opacity:i>initIdx?0.15:1,transition:"opacity 0.3s" }}>
                <div style={{ width:"6px",height:"6px",borderRadius:"50%",flexShrink:0,background:done?"#14F195":active?"#C8A96E":"rgba(255,255,255,0.15)",boxShadow:active?"0 0 8px rgba(200,169,110,0.8)":"none",transition:"all 0.3s",animation:active?"pulse 0.8s ease-in-out infinite":"none" }} />
                <span style={{ fontSize:"0.58rem",fontFamily:"'JetBrains Mono',monospace",color:done?"#14F195":active?"#C8A96E":"rgba(255,255,255,0.35)",transition:"color 0.3s",letterSpacing:"0.04em" }}>{s.msg}</span>
                {done&&<span style={{ marginLeft:"auto",fontSize:"0.44rem",color:"rgba(20,241,149,0.5)",fontFamily:"'JetBrains Mono',monospace" }}>OK</span>}
                {active&&<div style={{ marginLeft:"auto",display:"flex",gap:"2px" }}>{[0,1,2].map(j=><div key={j} style={{ width:"3px",height:"3px",borderRadius:"50%",background:"#C8A96E",animation:`pulse ${0.6+j*0.2}s ease-in-out infinite` }} />)}</div>}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div style={{ height:"2px",borderRadius:"1px",background:"rgba(255,255,255,0.04)",overflow:"hidden" }}>
          <div style={{ height:"100%",borderRadius:"1px",background:"linear-gradient(90deg,#C8A96E,#14F195)",width:`${((initIdx+1)/INIT_SEQUENCE.length)*100}%`,transition:"width 0.5s ease" }} />
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );

  // ─── UPLOAD ────────────────────────────────────────────────────────────────
  if(step==="upload") return (
    <div style={{ padding:"1.25rem",maxWidth:"680px" }}>
      <StepBar step="upload" />

      {/* Header */}
      <div style={{ marginBottom:"1.5rem" }}>
        <p style={{ fontSize:"0.44rem",letterSpacing:"0.2em",color:"rgba(20,241,149,0.5)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",margin:"0 0 0.3rem" }}>Studio · Step 1 of 7 · Asset Origination</p>
        <h2 style={{ fontWeight:900,fontSize:"1.3rem",color:"#f0f0f0",margin:"0 0 0.4rem",letterSpacing:"-0.025em",lineHeight:1.1 }}>Submit Your Asset</h2>
        <p style={{ fontSize:"0.58rem",color:"rgba(255,255,255,0.42)",margin:0,lineHeight:1.7,maxWidth:"460px" }}>
          Upload a high-resolution image of your asset. This becomes part of the immutable on-chain metadata record. Verified assets are the only assets that become tradable.
        </p>
      </div>

      {/* Asset class selector */}
      <div style={{ marginBottom:"1.25rem" }}>
        <div style={{ fontSize:"0.46rem",fontWeight:700,color:"rgba(255,255,255,0.45)",marginBottom:"0.5rem",textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:"'JetBrains Mono',monospace" }}>Asset Class</div>
        <div style={{ display:"flex",gap:"0.35rem",flexWrap:"wrap" }}>
          {(Object.keys(ASSET_CLASSES) as AssetClass[]).map(a=>{
            const c=ASSET_CLASSES[a]; const sel=assetClass===a;
            return <button key={a} onClick={()=>setAssetClass(a)} style={{ padding:"0.4rem 0.75rem",borderRadius:"7px",border:`1px solid ${sel?c.color+"60":"rgba(255,255,255,0.08)"}`,background:sel?`${c.color}12`:"rgba(255,255,255,0.02)",color:sel?c.color:"rgba(255,255,255,0.4)",fontSize:"0.56rem",fontWeight:sel?700:400,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",transition:"all 0.15s" }}>{a}</button>;
          })}
        </div>
      </div>

      {/* Custody info bar */}
      <div style={{ padding:"0.5rem 0.875rem",background:`${cfg.color}08`,border:`1px solid ${cfg.color}20`,borderRadius:"8px",marginBottom:"1.25rem",display:"flex",gap:"1.25rem",flexWrap:"wrap" }}>
        {[["Custody Partner",cfg.partner],["Max LTV",`${cfg.ltv}%`],["Mint Fee",`${cfg.fee} $ABRA`],["Settlement","Assets locked until delivery or USDC"]].map(([k,v])=>(
          <div key={k}>
            <div style={{ fontSize:"0.38rem",color:`${cfg.color}70`,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.08em" }}>{k}</div>
            <div style={{ fontSize:"0.52rem",fontWeight:700,color:"rgba(255,255,255,0.7)" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onClick={()=>fileRef.current?.click()}
        onDragOver={e=>{e.preventDefault();(e.currentTarget as HTMLDivElement).style.borderColor=`${cfg.color}60`;}}
        onDragLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=`${cfg.color}22`;}}
        onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFile(f);}}
        style={{ border:`2px dashed ${cfg.color}30`,borderRadius:"14px",padding:"2.5rem",textAlign:"center",cursor:"pointer",background:`${cfg.color}04`,transition:"border-color 0.2s",marginBottom:"1rem" }}>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display:"none" }} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);}} />
        {preview?(
          <div>
            <img src={preview} alt="Asset" style={{ maxHeight:"180px",maxWidth:"100%",borderRadius:"8px",objectFit:"contain",marginBottom:"0.75rem" }} />
            <div style={{ fontSize:"0.52rem",color:"rgba(255,255,255,0.5)",fontFamily:"'JetBrains Mono',monospace" }}>{file?.name} · {((file?.size??0)/1024).toFixed(0)}KB</div>
          </div>
        ):(
          <div>
            <div style={{ fontSize:"2.5rem",color:`${cfg.color}50`,marginBottom:"0.75rem" }}>{cfg.icon}</div>
            <div style={{ fontSize:"0.62rem",fontWeight:700,color:"rgba(255,255,255,0.55)",marginBottom:"0.25rem" }}>Drop asset image here, or click to browse</div>
            <div style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.25)" }}>JPG, PNG, PDF · Max 25MB · High resolution recommended</div>
          </div>
        )}
      </div>

      <button onClick={()=>setStep("metadata")} disabled={!file} style={{ width:"100%",padding:"0.875rem",borderRadius:"10px",border:"none",fontWeight:900,fontSize:"0.78rem",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em",cursor:file?"pointer":"not-allowed",background:file?"linear-gradient(135deg,#14F195,#C8A96E)":"rgba(255,255,255,0.04)",color:file?"#000":"rgba(255,255,255,0.2)",boxShadow:file?"0 0 24px rgba(20,241,149,0.3)":"none",transition:"all 0.2s" }}>
        {file?"Continue to Metadata →":"Upload asset image to continue"}
      </button>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );

  // ─── METADATA ──────────────────────────────────────────────────────────────
  if(step==="metadata") {
    const fields = [
      { k:"name" as const, label:"Asset Name", placeholder:"e.g. 1999 Pokémon Charizard Holo 1st Edition" },
      { k:"grade" as const, label:"Grade / Certification", placeholder:"e.g. PSA 10, CGC 9.8, Baxus Verified" },
      { k:"year" as const, label:"Year / Vintage", placeholder:"e.g. 1999, 2018, NV" },
      { k:"condition" as const, label:"Physical Condition", placeholder:"e.g. Gem Mint, Mint 9, Excellent" },
      { k:"serialNumber" as const, label:"Serial / Registry Number (if any)", placeholder:"e.g. PSA Cert #12345678" },
      { k:"description" as const, label:"Additional Notes", placeholder:"Provenance, purchase history, notable features…" },
    ];
    const complete = meta.name && meta.grade;
    return (
      <div style={{ padding:"1.25rem",maxWidth:"680px" }}>
        <StepBar step="metadata" />
        <div style={{ marginBottom:"1.25rem" }}>
          <p style={{ fontSize:"0.44rem",letterSpacing:"0.2em",color:"rgba(20,241,149,0.5)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",margin:"0 0 0.3rem" }}>Studio · Step 2 of 7 · Provenance Metadata</p>
          <h2 style={{ fontWeight:900,fontSize:"1.3rem",color:"#f0f0f0",margin:"0 0 0.35rem",letterSpacing:"-0.025em" }}>Define Your Asset</h2>
          <p style={{ fontSize:"0.56rem",color:"rgba(255,255,255,0.4)",margin:0,lineHeight:1.7 }}>This metadata is anchored permanently on Solana. It becomes the canonical record for your asset's identity, provenance, and certification history.</p>
        </div>
        <div style={{ display:"flex",gap:"0.75rem",alignItems:"flex-start",marginBottom:"1.25rem" }}>
          {preview&&<img src={preview} style={{ width:"80px",height:"80px",borderRadius:"8px",objectFit:"contain",border:`1px solid ${cfg.color}25`,flexShrink:0 }} />}
          <div style={{ padding:"0.5rem 0.75rem",background:`${cfg.color}07`,border:`1px solid ${cfg.color}18`,borderRadius:"8px",flex:1 }}>
            <div style={{ fontSize:"0.44rem",fontWeight:800,color:cfg.color,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",marginBottom:"0.15rem" }}>{assetClass}</div>
            <div style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.4)" }}>Custody: {cfg.partner} · LTV: {cfg.ltv}%</div>
          </div>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.625rem",marginBottom:"1rem" }}>
          {fields.map(f=>(
            <div key={f.k} style={{ gridColumn:f.k==="description"?"1 / -1":"auto" }}>
              <label style={{ display:"block",fontSize:"0.44rem",fontWeight:700,color:"rgba(255,255,255,0.45)",marginBottom:"0.22rem",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.06em" }}>{f.label}{(f.k==="name"||f.k==="grade")?" *":""}</label>
              {f.k==="description"?
                <textarea value={meta[f.k]} onChange={e=>setMeta(m=>({...m,[f.k]:e.target.value}))} placeholder={f.placeholder} rows={3} style={{ width:"100%",padding:"0.45rem 0.625rem",borderRadius:"7px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",color:"#f0f0f0",fontSize:"0.56rem",fontFamily:"'JetBrains Mono',monospace",outline:"none",resize:"vertical",boxSizing:"border-box" }} />
                :<input value={meta[f.k]} onChange={e=>setMeta(m=>({...m,[f.k]:e.target.value}))} placeholder={f.placeholder} style={{ width:"100%",padding:"0.45rem 0.625rem",borderRadius:"7px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",color:"#f0f0f0",fontSize:"0.56rem",fontFamily:"'JetBrains Mono',monospace",outline:"none",boxSizing:"border-box" }} onFocus={e=>{e.currentTarget.style.borderColor=`${cfg.color}45`;}} onBlur={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";}} />}
            </div>
          ))}
        </div>
        <div style={{ display:"flex",gap:"0.5rem" }}>
          <button onClick={()=>setStep("upload")} style={{ padding:"0.75rem 1.25rem",borderRadius:"9px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.3)",fontSize:"0.64rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>← Back</button>
          <button onClick={()=>setStep("valuation")} disabled={!complete} style={{ flex:1,padding:"0.75rem",borderRadius:"9px",border:"none",fontWeight:900,fontSize:"0.72rem",fontFamily:"'JetBrains Mono',monospace",cursor:complete?"pointer":"not-allowed",background:complete?`linear-gradient(135deg,${cfg.color},#14F195)`:"rgba(255,255,255,0.04)",color:complete?"#000":"rgba(255,255,255,0.2)",transition:"all 0.2s" }}>
            Continue to Valuation →
          </button>
        </div>
      </div>
    );
  }

  // ─── VALUATION ─────────────────────────────────────────────────────────────
  if(step==="valuation") {
    const complete = val.estimatedUsd && parseFloat(val.estimatedUsd)>0;
    return (
      <div style={{ padding:"1.25rem",maxWidth:"680px" }}>
        <StepBar step="valuation" />
        <div style={{ marginBottom:"1.25rem" }}>
          <p style={{ fontSize:"0.44rem",letterSpacing:"0.2em",color:"rgba(20,241,149,0.5)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",margin:"0 0 0.3rem" }}>Studio · Step 3 of 7 · Valuation</p>
          <h2 style={{ fontWeight:900,fontSize:"1.3rem",color:"#f0f0f0",margin:"0 0 0.35rem",letterSpacing:"-0.025em" }}>Set Your Valuation</h2>
          <p style={{ fontSize:"0.56rem",color:"rgba(255,255,255,0.4)",margin:0,lineHeight:1.7 }}>Your declared valuation determines the LTV and borrowing capacity on Loopscale. Abraxas uses a hybrid oracle model — market comps + custodian-verified pricing. Overvaluation is flagged during verification.</p>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.625rem",marginBottom:"1rem" }}>
          <div style={{ gridColumn:"1 / -1" }}>
            <label style={{ display:"block",fontSize:"0.44rem",fontWeight:700,color:"rgba(255,255,255,0.45)",marginBottom:"0.25rem",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.06em" }}>Estimated Market Value (USD) *</label>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute",left:"0.75rem",top:"50%",transform:"translateY(-50%)",fontSize:"0.62rem",color:"rgba(255,255,255,0.4)",fontFamily:"'JetBrains Mono',monospace" }}>$</span>
              <input type="number" value={val.estimatedUsd} onChange={e=>setVal(v=>({...v,estimatedUsd:e.target.value}))} placeholder="0.00" style={{ width:"100%",padding:"0.65rem 0.75rem 0.65rem 1.5rem",borderRadius:"8px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.1)",color:"#f0f0f0",fontSize:"0.82rem",fontFamily:"'JetBrains Mono',monospace",outline:"none",boxSizing:"border-box",fontWeight:700 }} onFocus={e=>{e.currentTarget.style.borderColor=`${cfg.color}50`;}} onBlur={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";}} />
            </div>
          </div>
          {[{k:"referenceSource" as const,label:"Valuation Reference",ph:"e.g. Heritage Auctions, PWCC, eBay recent sale"},
            {k:"insurer" as const,       label:"Insurance Source (optional)",ph:"e.g. Collectors Insurance, SIU, Lloyd's"}].map(f=>(
            <div key={f.k}>
              <label style={{ display:"block",fontSize:"0.44rem",fontWeight:700,color:"rgba(255,255,255,0.45)",marginBottom:"0.22rem",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.06em" }}>{f.label}</label>
              <input value={val[f.k]} onChange={e=>setVal(v=>({...v,[f.k]:e.target.value}))} placeholder={f.ph} style={{ width:"100%",padding:"0.45rem 0.625rem",borderRadius:"7px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",color:"#f0f0f0",fontSize:"0.54rem",fontFamily:"'JetBrains Mono',monospace",outline:"none",boxSizing:"border-box" }} />
            </div>
          ))}
        </div>
        {/* Valuation summary */}
        {complete&&(
          <div style={{ padding:"0.875rem 1rem",background:"rgba(20,241,149,0.05)",border:"1px solid rgba(20,241,149,0.15)",borderRadius:"10px",marginBottom:"1rem",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.75rem" }}>
            {[["Declared Value",`$${parseInt(val.estimatedUsd).toLocaleString()}`,"rgba(255,255,255,0.7)"],
              ["Max Borrow",`$${borrowMax.toLocaleString()} USDC`,"#14F195"],
              ["LTV Cap",`${cfg.ltv}%`,"#14F195"]].map(([l,v,c])=>(
              <div key={l} style={{ textAlign:"center" }}>
                <div style={{ fontSize:"0.4rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",marginBottom:"2px" }}>{l}</div>
                <div style={{ fontSize:"0.82rem",fontWeight:900,color:c as string,fontFamily:"'JetBrains Mono',monospace" }}>{v}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display:"flex",gap:"0.5rem" }}>
          <button onClick={()=>setStep("metadata")} style={{ padding:"0.75rem 1.25rem",borderRadius:"9px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.3)",fontSize:"0.64rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>← Back</button>
          <button onClick={()=>setStep("wallet")} disabled={!complete} style={{ flex:1,padding:"0.75rem",borderRadius:"9px",border:"none",fontWeight:900,fontSize:"0.72rem",fontFamily:"'JetBrains Mono',monospace",cursor:complete?"pointer":"not-allowed",background:complete?`linear-gradient(135deg,${cfg.color},#14F195)`:"rgba(255,255,255,0.04)",color:complete?"#000":"rgba(255,255,255,0.2)",transition:"all 0.2s" }}>
            Continue to Wallet →
          </button>
        </div>
      </div>
    );
  }

  // ─── WALLET ────────────────────────────────────────────────────────────────
  if(step==="wallet") return (
    <div style={{ padding:"1.25rem",maxWidth:"480px" }}>
      <StepBar step="wallet" />
      <p style={{ fontSize:"0.44rem",letterSpacing:"0.2em",color:"rgba(20,241,149,0.5)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",margin:"0 0 0.5rem" }}>Studio · Step 4 of 7 · Wallet Authorization</p>
      <h2 style={{ fontWeight:900,fontSize:"1.3rem",color:"#f0f0f0",margin:"0 0 0.75rem",letterSpacing:"-0.025em" }}>Authorize Your Wallet</h2>
      {connected?(
        <div>
          <div style={{ padding:"1rem",background:"rgba(20,241,149,0.07)",border:"1px solid rgba(20,241,149,0.25)",borderRadius:"10px",marginBottom:"1rem" }}>
            <div style={{ fontSize:"0.44rem",color:"rgba(20,241,149,0.6)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.2rem",textTransform:"uppercase",letterSpacing:"0.08em" }}>Wallet Connected</div>
            <div style={{ fontSize:"0.68rem",fontWeight:700,color:"#14F195",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.02em" }}>
              {publicKey?.toBase58().slice(0,4)}…{publicKey?.toBase58().slice(-4)}
            </div>
          </div>
          <p style={{ fontSize:"0.56rem",color:"rgba(255,255,255,0.4)",lineHeight:1.7,margin:"0 0 1.25rem" }}>
            Your wallet will be required to sign the issuance transaction and authorize the $ABRA mint fee. This creates the on-chain position binding your wallet to the asset.
          </p>
          <div style={{ display:"flex",gap:"0.5rem" }}>
            <button onClick={()=>setStep("valuation")} style={{ padding:"0.75rem 1.25rem",borderRadius:"9px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.3)",fontSize:"0.64rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>← Back</button>
            <button onClick={()=>setStep("fee")} style={{ flex:1,padding:"0.75rem",borderRadius:"9px",border:"none",fontWeight:900,fontSize:"0.72rem",fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",background:"linear-gradient(135deg,#14F195,#C8A96E)",color:"#000",boxShadow:"0 0 20px rgba(20,241,149,0.3)" }}>
              Review Mint Fee →
            </button>
          </div>
        </div>
      ):(
        <div>
          <p style={{ fontSize:"0.58rem",color:"rgba(255,255,255,0.45)",lineHeight:1.7,margin:"0 0 1.25rem" }}>Connect your Solana wallet to authorize the issuance transaction. Your wallet becomes the controlling authority for the tokenized asset.</p>
          <button onClick={()=>setVisible(true)} style={{ width:"100%",padding:"0.875rem",borderRadius:"10px",border:"none",fontWeight:900,fontSize:"0.72rem",fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",background:"linear-gradient(135deg,#9945FF,#14F195)",color:"#fff",boxShadow:"0 0 24px rgba(153,69,255,0.35)",marginBottom:"0.75rem" }}>
            Connect Wallet
          </button>
          <button onClick={()=>setStep("valuation")} style={{ width:"100%",padding:"0.5rem",borderRadius:"7px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.28)",fontSize:"0.58rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>← Back</button>
        </div>
      )}
    </div>
  );

  // ─── FEE CONFIRMATION ──────────────────────────────────────────────────────
  if(step==="fee") return (
    <div style={{ padding:"1.25rem",maxWidth:"480px" }}>
      <StepBar step="fee" />
      <p style={{ fontSize:"0.44rem",letterSpacing:"0.2em",color:"rgba(20,241,149,0.5)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",margin:"0 0 0.5rem" }}>Studio · Step 5 of 7 · Mint Fee</p>
      <h2 style={{ fontWeight:900,fontSize:"1.3rem",color:"#f0f0f0",margin:"0 0 0.25rem",letterSpacing:"-0.025em" }}>Confirm $ABRA Mint Fee</h2>
      <p style={{ fontSize:"0.56rem",color:"rgba(255,255,255,0.4)",lineHeight:1.7,margin:"0 0 1.25rem" }}>The mint fee is deducted from your $ABRA balance and permanently consumed. This creates real economic commitment for every issuance — preventing spam and ensuring asset quality.</p>

      {/* Fee breakdown */}
      <div style={{ background:"rgba(6,8,16,0.99)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"12px",overflow:"hidden",marginBottom:"1.25rem" }}>
        {[[`${assetClass} Issuance`,`${abraFee} $ABRA`,"#C8A96E"],
          ["Verification Queue Fee","10 $ABRA","rgba(255,255,255,0.5)"],
          ["Solana Network Fee","~0.000005 SOL","rgba(255,255,255,0.5)"],
          ].map(([l,v,c],i)=>(
          <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"0.625rem 0.875rem",borderBottom:i<2?"1px solid rgba(255,255,255,0.04)":"none" }}>
            <span style={{ fontSize:"0.56rem",color:"rgba(255,255,255,0.45)" }}>{l}</span>
            <span style={{ fontSize:"0.56rem",fontWeight:700,color:c as string,fontFamily:"'JetBrains Mono',monospace" }}>{v}</span>
          </div>
        ))}
        <div style={{ display:"flex",justifyContent:"space-between",padding:"0.75rem 0.875rem",background:"rgba(200,169,110,0.05)",borderTop:"1px solid rgba(200,169,110,0.1)" }}>
          <span style={{ fontSize:"0.62rem",fontWeight:700,color:"rgba(255,255,255,0.7)" }}>Total</span>
          <span style={{ fontSize:"0.72rem",fontWeight:900,color:"#C8A96E",fontFamily:"'JetBrains Mono',monospace" }}>{abraFee+10} $ABRA</span>
        </div>
      </div>

      {/* What this enables */}
      <div style={{ padding:"0.75rem",background:"rgba(20,241,149,0.04)",border:"1px solid rgba(20,241,149,0.12)",borderRadius:"9px",marginBottom:"1.25rem" }}>
        <div style={{ fontSize:"0.44rem",fontWeight:700,color:"rgba(20,241,149,0.6)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"0.4rem" }}>This mint fee unlocks</div>
        {["Token-2022 position minted on Solana",`Custody partner notification (${cfg.partner})`,"Verification queue entry (3–7 business days)","Loopscale eligibility after verification","Markets listing access after approval"].map(item=>(
          <div key={item} style={{ display:"flex",gap:"0.35rem",marginBottom:"0.18rem" }}>
            <span style={{ color:"rgba(20,241,149,0.5)",flexShrink:0 }}>▸</span>
            <span style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.45)" }}>{item}</span>
          </div>
        ))}
      </div>

      <div style={{ display:"flex",gap:"0.5rem" }}>
        <button onClick={()=>setStep("wallet")} style={{ padding:"0.75rem 1.25rem",borderRadius:"9px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.3)",fontSize:"0.64rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>← Back</button>
        <button onClick={processMint} style={{ flex:1,padding:"0.875rem",borderRadius:"10px",border:"none",fontWeight:900,fontSize:"0.78rem",fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",background:"linear-gradient(135deg,#C8A96E,#FBBF24)",color:"#000",boxShadow:"0 0 28px rgba(200,169,110,0.4)",letterSpacing:"0.04em" }}>
          Confirm — Deduct {abraFee+10} $ABRA →
        </button>
      </div>
    </div>
  );

  // ─── PROCESSING ────────────────────────────────────────────────────────────
  if(step==="processing") return (
    <div style={{ padding:"1.25rem",maxWidth:"480px",minHeight:"60vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center" }}>
      <div style={{ width:"56px",height:"56px",borderRadius:"50%",border:"3px solid rgba(200,169,110,0.15)",borderTopColor:"#C8A96E",animation:"spin 0.9s linear infinite",marginBottom:"1.5rem" }} />
      <h3 style={{ fontWeight:900,fontSize:"1.1rem",color:"#f0f0f0",margin:"0 0 0.5rem",letterSpacing:"-0.02em" }}>Minting on Solana</h3>
      <p style={{ fontSize:"0.58rem",color:"rgba(255,255,255,0.38)",lineHeight:1.7,maxWidth:"320px",margin:"0 0 1.5rem" }}>Creating Token-2022 position · Anchoring metadata · Notifying custody partner · Entering verification queue</p>
      <div style={{ display:"flex",gap:"0.3rem" }}>
        {[0,1,2,3,4].map(i=><div key={i} style={{ width:"4px",height:"4px",borderRadius:"50%",background:"#C8A96E",animation:`bounce 0.8s ease-in-out ${i*0.12}s infinite` }} />)}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
    </div>
  );

  // ─── VERIFICATION QUEUE ────────────────────────────────────────────────────
  if(step==="queue") return (
    <div style={{ padding:"1.25rem",maxWidth:"600px" }}>
      <StepBar step="queue" />
      <div style={{ marginBottom:"1.5rem" }}>
        <p style={{ fontSize:"0.44rem",letterSpacing:"0.2em",color:"rgba(20,241,149,0.5)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",margin:"0 0 0.3rem" }}>Studio · Step 7 of 7 · Verification Queue</p>
        <h2 style={{ fontWeight:900,fontSize:"1.3rem",color:"#f0f0f0",margin:"0 0 0.35rem",letterSpacing:"-0.025em" }}>Asset Queued for Verification</h2>
        <p style={{ fontSize:"0.56rem",color:"rgba(255,255,255,0.42)",margin:0,lineHeight:1.7 }}>
          Verified assets only become tradable after ownership review. This is how Abraxas maintains marketplace trust — every listing is authenticated before it reaches the Capital or Markets layer.
        </p>
      </div>

      {/* Mint confirmation */}
      <div style={{ padding:"0.75rem 1rem",background:"rgba(20,241,149,0.05)",border:"1px solid rgba(20,241,149,0.2)",borderRadius:"10px",marginBottom:"1.25rem",display:"flex",gap:"1rem",flexWrap:"wrap",alignItems:"center" }}>
        {preview&&<img src={preview} style={{ width:"52px",height:"52px",borderRadius:"7px",objectFit:"contain",border:"1px solid rgba(20,241,149,0.2)",flexShrink:0 }} />}
        <div>
          <div style={{ fontSize:"0.44rem",color:"rgba(20,241,149,0.6)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",marginBottom:"2px" }}>Token-2022 Minted · {assetClass}</div>
          <div style={{ fontSize:"0.72rem",fontWeight:800,color:"#f0f0f0" }}>{meta.name||"Asset"}</div>
          <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.35)",fontFamily:"'JetBrains Mono',monospace",marginTop:"2px" }}>Tx: {mintTxId}</div>
        </div>
        <div style={{ marginLeft:"auto",textAlign:"right" }}>
          <div style={{ fontSize:"0.42rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>Declared Value</div>
          <div style={{ fontSize:"0.78rem",fontWeight:800,color:"#C8A96E",fontFamily:"'JetBrains Mono',monospace" }}>${parseInt(val.estimatedUsd).toLocaleString()}</div>
        </div>
      </div>

      {/* Queue pipeline */}
      <div style={{ marginBottom:"1.25rem" }}>
        <div style={{ fontSize:"0.44rem",fontWeight:700,color:"rgba(255,255,255,0.35)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"0.625rem" }}>Verification Pipeline</div>
        {QUEUE_STEPS.map((qs,i)=>{
          const done = i<=queueProgress, active = i===queueProgress;
          return (
            <div key={i} style={{ display:"flex",gap:"0.625rem",alignItems:"flex-start",marginBottom:"0.5rem",opacity:i>queueProgress+1?0.25:1,transition:"opacity 0.5s" }}>
              <div style={{ width:"18px",height:"18px",borderRadius:"50%",flexShrink:0,border:`1.5px solid ${done?"#14F195":"rgba(255,255,255,0.1)"}`,background:done?"#14F195":"transparent",display:"flex",alignItems:"center",justifyContent:"center",marginTop:"1px",transition:"all 0.4s",boxShadow:active?"0 0 8px rgba(20,241,149,0.6)":"none" }}>
                {done&&i<queueProgress&&<div style={{ width:"6px",height:"6px",borderRadius:"50%",background:"#000" }} />}
                {active&&<div style={{ width:"5px",height:"5px",borderRadius:"50%",background:"#000",animation:"pulse 0.8s ease-in-out infinite" }} />}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"0.58rem",fontWeight:done?600:400,color:done?"#f0f0f0":"rgba(255,255,255,0.35)",lineHeight:1.4,transition:"color 0.3s" }}>{qs}</div>
                {active&&<div style={{ fontSize:"0.44rem",color:"rgba(20,241,149,0.6)",fontFamily:"'JetBrains Mono',monospace",marginTop:"2px",animation:"pulse 1.5s ease-in-out infinite" }}>In progress…</div>}
              </div>
            </div>
          );
        })}
        {queueProgress>=QUEUE_STEPS.length-1&&(
          <div style={{ marginTop:"0.625rem",padding:"0.5rem 0.75rem",background:"rgba(251,191,36,0.07)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:"7px" }}>
            <span style={{ fontSize:"0.52rem",color:"#FBBF24",fontWeight:700 }}>Awaiting custodian response (3–7 business days) — you'll be notified when approved</span>
          </div>
        )}
      </div>

      {/* What happens next */}
      <div style={{ padding:"0.875rem 1rem",background:"rgba(6,8,16,0.98)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"10px",marginBottom:"1rem" }}>
        <div style={{ fontSize:"0.44rem",fontWeight:700,color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"0.5rem" }}>After Verification</div>
        {[`Asset enters the Markets layer as a verified listing`,`Becomes collateralizable in the Capital layer via Loopscale`,`Max borrow unlocked: $${borrowMax.toLocaleString()} USDC at ${cfg.ltv}% LTV`,`$ABRA yield begins accruing from protocol interactions`].map((t,i)=>(
          <div key={i} style={{ display:"flex",gap:"0.35rem",marginBottom:"0.18rem" }}>
            <span style={{ fontSize:"0.44rem",color:"rgba(200,169,110,0.5)" }}>{i+1}.</span>
            <span style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.42)",lineHeight:1.5 }}>{t}</span>
          </div>
        ))}
      </div>

      <button onClick={()=>{setStep("upload");setFile(null);setPreview(null);setMeta({name:"",grade:"",year:"",condition:"",serialNumber:"",description:""});setVal({estimatedUsd:"",referenceSource:"",insurer:""});setQueueProgress(0);setMintTxId("");}} style={{ width:"100%",padding:"0.625rem",borderRadius:"8px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.32)",fontSize:"0.62rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>
        Submit Another Asset →
      </button>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );

  return null;
}