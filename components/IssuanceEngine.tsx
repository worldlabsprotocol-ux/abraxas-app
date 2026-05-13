// FILE: components/IssuanceEngine.tsx
// Studio Layer III — 7-step tokenization flow wired to Supabase + Zustand fallback
// Step flow: upload → metadata → valuation → wallet → fee → processing → queue
"use client";

import { useState, useEffect, useRef } from "react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAbraStore } from "@/lib/abraxasStore";

type AssetClass = "Spirits"|"Watches"|"Cards (PSA/BGS)"|"Comics (CGC)"|"Racehorses"|"Metals"|"Art"|"Other";
type Step = "upload"|"metadata"|"valuation"|"wallet"|"fee"|"processing"|"queue";

// Self-contained vault allocation type — no external import dependency
interface VaultAllocation {
  mainVault:  { address: string; amount: number; pct: number };
  classVault: { address: string; amount: number; pct: number };
  total:      number;
  assetClass: string;
}

const VAULTS = {
  MAIN:        "63LGWS2JSK5CawZt6iPchVU6wj63v3DtsTR1jaRnjMaY",
  WATCHES:     "CQ1UzRrB6C2XV39wZNB7URKwGRhEKkDQgc2xVF5dJGdf",
  SPIRITS:     "CmWVgyeS8uR9ForuhBPs9vPoQknTMAs8CZuenLiotdDk",
  CARDS:       "8bBxipDGxTL3B84RSuwxwVysAKreStoHbJKTSHpqfT58",
  METALS:      "Db6RHGeqsZYkxjMvqjFQ4EV8KLs9xMxto3dK9Y8Q9TFf",
  COLLECTIBLES:"HeFqPHNCTgZ68fxaGgJes9af16W63mg7UbZUy5LScwZq",
};

const ASSET_CLASSES: Record<AssetClass,{color:string;partner:string;ltv:number;fee:number;icon:string;desc:string;example:string;}> = {
  "Spirits":        {color:"#FF8C00",partner:"Baxus",           ltv:55,fee:100,icon:"◈",desc:"Single malts, bourbons, rare releases",        example:"Pappy Van Winkle 2021 · $2,400"},
  "Watches":        {color:"#6b8cff",partner:"Courtyard",        ltv:65,fee:150,icon:"◎",desc:"Rolex, AP, Patek, luxury timepieces",           example:"Rolex Submariner · $11,000"},
  "Cards (PSA/BGS)":{color:"#FBBF24",partner:"Collector Crypt",  ltv:55,fee:80, icon:"⬡",desc:"Graded Pokémon, sports, One Piece cards",       example:"1999 Charizard PSA 10 · $550,000"},
  "Comics (CGC)":   {color:"#a855f7",partner:"Metropolis",        ltv:65,fee:120,icon:"◫",desc:"Vintage comics, CGC certified",                 example:"Amazing Fantasy #15 · $525,000"},
  "Racehorses":     {color:"#22c55e",partner:"The Jockey Club",  ltv:55,fee:200,icon:"◉",desc:"Thoroughbred bloodstock, fractional ownership", example:"American Pharoah 2015 · $120,000"},
  "Metals":         {color:"#D4AF37",partner:"LBMA",             ltv:80,fee:60, icon:"◆",desc:"Gold and silver bars, LBMA certified",          example:"Gold 1oz · $4,733"},
  "Art":            {color:"#f26b6b",partner:"Verified Custodian",ltv:50,fee:180,icon:"◭",desc:"Fine art, authenticated provenance",            example:"Submit for review · custom valuation"},
  "Other":          {color:"#C8A96E",partner:"Manual Review",    ltv:45,fee:250,icon:"⬢",desc:"Any verified physical asset",                  example:"Submit for review · all categories"},
};

const QUEUE_STEPS = [
  "Asset received by issuance protocol",
  "Metadata hash anchored to Solana",
  "Custodian notification dispatched",
  "Physical verification request initiated",
  "Awaiting ownership confirmation",
];

function calcVaultAlloc(assetClass: AssetClass, total: number): VaultAllocation {
  const CLASS_MAP: Record<string,string> = {
    "Watches":VAULTS.WATCHES,"Spirits":VAULTS.SPIRITS,
    "Cards (PSA/BGS)":VAULTS.CARDS,"Comics (CGC)":VAULTS.COLLECTIBLES,
    "Racehorses":VAULTS.COLLECTIBLES,"Metals":VAULTS.METALS,
  };
  const classAddr = CLASS_MAP[assetClass] ?? VAULTS.MAIN;
  const same = classAddr === VAULTS.MAIN;
  const mainAmt  = same ? total : Math.floor(total * 0.8);
  const classAmt = same ? 0     : total - mainAmt;
  return {
    mainVault:  { address:VAULTS.MAIN,  amount:mainAmt,  pct:same?100:80 },
    classVault: { address:classAddr,    amount:classAmt, pct:same?0:20  },
    total, assetClass,
  };
}

// ─── Step progress bar ────────────────────────────────────────────────────────
function StepBar({ step }:{ step:Step }) {
  const STEPS:Step[] = ["upload","metadata","valuation","wallet","fee","processing","queue"];
  const idx = STEPS.indexOf(step);
  return (
    <div style={{display:"flex",alignItems:"center",gap:"0",marginBottom:"1.75rem"}}>
      {STEPS.map((s,i)=>{
        const done=i<idx, active=i===idx;
        const col=done||active?"#14F195":"rgba(255,255,255,0.1)";
        return (
          <div key={s} style={{display:"flex",alignItems:"center",flex:i<STEPS.length-1?"1":"0"}}>
            <div style={{width:"18px",height:"18px",borderRadius:"50%",border:`2px solid ${col}`,background:done?"#14F195":"rgba(6,8,16,0.99)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.3s"}}>
              {done&&<div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#000"}}/>}
              {active&&<div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#14F195",animation:"pulse 1s ease-in-out infinite"}}/>}
            </div>
            {i<STEPS.length-1&&<div style={{flex:1,height:"1px",background:done?"#14F19560":"rgba(255,255,255,0.06)",transition:"background 0.4s"}}/>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Custody safety banner ────────────────────────────────────────────────────
function CustodySafetyBanner() {
  return (
    <div style={{marginBottom:"1rem",padding:"0.6rem 0.875rem",background:"rgba(20,241,149,0.04)",border:"1px solid rgba(20,241,149,0.1)",borderRadius:"9px",display:"flex",gap:"0.625rem",alignItems:"flex-start"}}>
      <span style={{fontSize:"0.9rem",color:"rgba(20,241,149,0.5)",flexShrink:0}}>🔐</span>
      <div>
        <div style={{fontSize:"0.44rem",fontWeight:800,color:"rgba(20,241,149,0.6)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"0.15rem"}}>Your asset stays in your control — always</div>
        <div style={{fontSize:"0.48rem",color:"rgba(255,255,255,0.38)",lineHeight:1.6}}>Tokenizing does not transfer ownership. Your wallet holds the on-chain token. No transfer can occur without your wallet signature and custody partner co-sign.</div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function IssuanceEngine() {
  const { connected, publicKey } = useWallet();
  const { setVisible }           = useWalletModal();
  const abraBalance  = useAbraStore(s=>s.abraBalance);
  const abraUsdPrice = useAbraStore(s=>s.abraUsdPrice);
  const mintAsset    = useAbraStore(s=>s.mintAsset);

  const [step,       setStep]      = useState<Step>("upload");
  const [assetClass, setAssetClass]= useState<AssetClass>("Watches");
  const [file,       setFile]      = useState<File|null>(null);
  const [preview,    setPreview]   = useState<string|null>(null);
  const [meta,       setMeta]      = useState({name:"",grade:"",year:"",condition:"",serialNumber:"",description:""});
  const [val,        setVal]       = useState({estimatedUsd:"",referenceSource:"",insurer:""});
  const [queueProgress,setQueueProgress]=useState(0);
  const [mintTxId,   setMintTxId]  = useState("");
  const [lastAssetId,setLastAssetId]=useState<string|null>(null);
  const [vaultAlloc, setVaultAlloc]=useState<VaultAllocation|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const mintedAsset = useAbraStore(s=>s.assets.find(a=>a.id===lastAssetId));
  const cfg         = ASSET_CLASSES[assetClass];
  const abraFee     = cfg.fee;
  const estUsd      = parseFloat(val.estimatedUsd)||0;
  const borrowMax   = Math.round(estUsd * cfg.ltv / 100);

  useEffect(()=>{
    try { setVaultAlloc(calcVaultAlloc(assetClass, abraFee+10)); }
    catch { /* vault router not available */ }
  }, [assetClass, abraFee]);

  useEffect(()=>{
    if(step!=="queue") return;
    const iv=setInterval(()=>setQueueProgress(p=>{if(p>=QUEUE_STEPS.length-1){clearInterval(iv);return p;}return p+1;}),1800);
    return()=>clearInterval(iv);
  },[step]);

  function handleFile(f:File){
    setFile(f);
    const r=new FileReader();
    r.onload=e=>setPreview(e.target?.result as string);
    r.readAsDataURL(f);
  }

  async function processMint(){
    setStep("processing");
    const wallet=publicKey?.toBase58()??"demo-wallet";

    // API path (Supabase atomic mint: tx + asset + event)
    try {
      const res=await fetch("/api/mint",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          wallet,
          asset:{
            name:meta.name||"Unnamed Asset",
            description:meta.description||"",
            assetClass,
            estimatedUsd:estUsd,
            ltv:cfg.ltv,
            custodyPartner:cfg.partner,
            imagePreview:preview??null,     // null is fine for JSON/Supabase
            grade:meta.grade||null,
            year:meta.year||null,
          },
          mintCostAbra:abraFee+10,
        }),
      });
      if(res.ok){
        const data=await res.json();
        if(data.success){
          if(data.assetId)     setLastAssetId(data.assetId);
          if(data.txSignature) setMintTxId(data.txSignature);
          setStep("queue");
          return;
        }
      }
    } catch { /* API unavailable — use Zustand fallback */ }

    // Zustand fallback (demo / no Supabase)
    // imagePreview must be string|undefined (not null) for Omit<AbraAsset>
    const result=mintAsset({
      name:         meta.name||"Unnamed Asset",
      description:  meta.description||"",
      assetClass,
      mintCostAbra: abraFee+10,
      imagePreview: preview??undefined,     // undefined for Zustand AbraAsset
      estimatedUsd: estUsd,
      ltv:          cfg.ltv,
      custodyPartner:cfg.partner,
      grade:        meta.grade||undefined,
      year:         meta.year||undefined,
    }, wallet);

    if(!result){ setStep("fee"); return; }
    setLastAssetId(result.id);
    setMintTxId(result.txSignature);
    setStep("queue");
  }

  // ─── UPLOAD ────────────────────────────────────────────────────────────────
  if(step==="upload") return (
    <div style={{padding:"1.25rem",maxWidth:"680px"}}>
      <StepBar step="upload"/>
      <CustodySafetyBanner/>
      <div style={{marginBottom:"1.5rem"}}>
        <p style={{fontSize:"0.44rem",letterSpacing:"0.2em",color:"rgba(20,241,149,0.5)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",margin:"0 0 0.3rem"}}>Studio · Step 1 of 7 · Asset Origination</p>
        <h2 style={{fontWeight:900,fontSize:"1.3rem",color:"#f0f0f0",margin:"0 0 0.4rem",letterSpacing:"-0.025em",lineHeight:1.1}}>Submit Your Asset</h2>
        <p style={{fontSize:"0.58rem",color:"rgba(255,255,255,0.42)",margin:0,lineHeight:1.7,maxWidth:"460px"}}>Upload a high-resolution image. This becomes part of the immutable on-chain metadata record. Verified assets are the only assets that become tradable.</p>
      </div>
      {/* Asset class selector */}
      <div style={{marginBottom:"1.25rem"}}>
        <div style={{fontSize:"0.46rem",fontWeight:700,color:"rgba(255,255,255,0.45)",marginBottom:"0.5rem",textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:"'JetBrains Mono',monospace"}}>Asset Class</div>
        <div style={{display:"flex",gap:"0.35rem",flexWrap:"wrap"}}>
          {(Object.keys(ASSET_CLASSES) as AssetClass[]).map(a=>{
            const c=ASSET_CLASSES[a];const sel=assetClass===a;
            return <button key={a} onClick={()=>setAssetClass(a)} style={{padding:"0.4rem 0.75rem",borderRadius:"7px",border:`1px solid ${sel?c.color+"60":"rgba(255,255,255,0.08)"}`,background:sel?`${c.color}12`:"rgba(255,255,255,0.02)",color:sel?c.color:"rgba(255,255,255,0.4)",fontSize:"0.56rem",fontWeight:sel?700:400,cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",transition:"all 0.15s"}}>{a}</button>;
          })}
        </div>
      </div>
      {/* Custody info */}
      <div style={{padding:"0.5rem 0.875rem",background:`${cfg.color}08`,border:`1px solid ${cfg.color}20`,borderRadius:"8px",marginBottom:"1.25rem",display:"flex",gap:"1.25rem",flexWrap:"wrap"}}>
        {([["Custody Partner",cfg.partner],["Max LTV",`${cfg.ltv}%`],["Mint Fee",`${abraFee+10} $ABRA`],["Settlement","Locked until delivery or USDC"]] as [string,string][]).map(([k,v])=>(
          <div key={k}><div style={{fontSize:"0.38rem",color:`${cfg.color}70`,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.08em"}}>{k}</div><div style={{fontSize:"0.52rem",fontWeight:700,color:"rgba(255,255,255,0.7)"}}>{v}</div></div>
        ))}
      </div>
      {/* Drop zone */}
      <div onClick={()=>fileRef.current?.click()} onDragOver={e=>{e.preventDefault();(e.currentTarget as HTMLDivElement).style.borderColor=`${cfg.color}60`;}} onDragLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=`${cfg.color}22`;}} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFile(f);}} style={{border:`2px dashed ${cfg.color}30`,borderRadius:"14px",padding:"2.5rem",textAlign:"center",cursor:"pointer",background:`${cfg.color}04`,transition:"border-color 0.2s",marginBottom:"1rem"}}>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);}}/>
        {preview?(
          <div><img src={preview} alt="Asset" style={{maxHeight:"180px",maxWidth:"100%",borderRadius:"8px",objectFit:"contain",marginBottom:"0.75rem"}}/><div style={{fontSize:"0.52rem",color:"rgba(255,255,255,0.5)",fontFamily:"'JetBrains Mono',monospace"}}>{file?.name} · {((file?.size??0)/1024).toFixed(0)}KB</div></div>
        ):(
          <div><div style={{fontSize:"2.5rem",color:`${cfg.color}50`,marginBottom:"0.75rem"}}>{cfg.icon}</div><div style={{fontSize:"0.62rem",fontWeight:700,color:"rgba(255,255,255,0.55)",marginBottom:"0.25rem"}}>Drop asset image here, or click to browse</div><div style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.25)"}}>JPG, PNG, PDF · Max 25MB · High resolution recommended</div></div>
        )}
      </div>
      <button onClick={()=>setStep("metadata")} disabled={!file} style={{width:"100%",padding:"0.875rem",borderRadius:"10px",border:"none",fontWeight:900,fontSize:"0.78rem",fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em",cursor:file?"pointer":"not-allowed",background:file?"linear-gradient(135deg,#14F195,#C8A96E)":"rgba(255,255,255,0.04)",color:file?"#000":"rgba(255,255,255,0.2)",boxShadow:file?"0 0 24px rgba(20,241,149,0.3)":"none",transition:"all 0.2s"}}>
        {file?"Continue to Metadata →":"Upload asset image to continue"}
      </button>
    </div>
  );

  // ─── METADATA ──────────────────────────────────────────────────────────────
  if(step==="metadata"){
    const fields=[
      {k:"name" as const,      label:"Asset Name *",                  placeholder:"e.g. 1999 Pokémon Charizard Holo 1st Edition"},
      {k:"grade" as const,     label:"Grade / Certification *",       placeholder:"e.g. PSA 10, CGC 9.8, Baxus Verified"},
      {k:"year" as const,      label:"Year / Vintage",                placeholder:"e.g. 1999, 2018, NV"},
      {k:"condition" as const, label:"Physical Condition",            placeholder:"e.g. Gem Mint, Mint 9, Excellent"},
      {k:"serialNumber" as const,label:"Serial / Registry Number",     placeholder:"e.g. PSA Cert #12345678"},
      {k:"description" as const,label:"Additional Notes",             placeholder:"Provenance, purchase history, notable features…"},
    ];
    const complete=!!(meta.name&&meta.grade);
    return (
      <div style={{padding:"1.25rem",maxWidth:"680px"}}>
        <StepBar step="metadata"/>
        <CustodySafetyBanner/>
        <div style={{marginBottom:"1.25rem"}}>
          <p style={{fontSize:"0.44rem",letterSpacing:"0.2em",color:"rgba(20,241,149,0.5)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",margin:"0 0 0.3rem"}}>Studio · Step 2 of 7 · Provenance Metadata</p>
          <h2 style={{fontWeight:900,fontSize:"1.3rem",color:"#f0f0f0",margin:"0 0 0.35rem",letterSpacing:"-0.025em"}}>Define Your Asset</h2>
          <p style={{fontSize:"0.56rem",color:"rgba(255,255,255,0.4)",margin:0,lineHeight:1.7}}>This metadata is anchored permanently on Solana — the canonical record for your asset's identity, provenance, and certification history.</p>
        </div>
        <div style={{display:"flex",gap:"0.75rem",alignItems:"flex-start",marginBottom:"1.25rem"}}>
          {preview&&<img src={preview} style={{width:"80px",height:"80px",borderRadius:"8px",objectFit:"contain",border:`1px solid ${cfg.color}25`,flexShrink:0}}/>}
          <div style={{padding:"0.5rem 0.75rem",background:`${cfg.color}07`,border:`1px solid ${cfg.color}18`,borderRadius:"8px",flex:1}}>
            <div style={{fontSize:"0.44rem",fontWeight:800,color:cfg.color,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",marginBottom:"0.15rem"}}>{assetClass}</div>
            <div style={{fontSize:"0.46rem",color:"rgba(255,255,255,0.4)"}}>Custody: {cfg.partner} · LTV: {cfg.ltv}%</div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.625rem",marginBottom:"1rem"}}>
          {fields.map(f=>(
            <div key={f.k} style={{gridColumn:f.k==="description"?"1 / -1":"auto"}}>
              <label style={{display:"block",fontSize:"0.44rem",fontWeight:700,color:"rgba(255,255,255,0.45)",marginBottom:"0.22rem",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.06em"}}>{f.label}</label>
              {f.k==="description"
                ?<textarea value={meta[f.k]} onChange={e=>setMeta(m=>({...m,[f.k]:e.target.value}))} placeholder={f.placeholder} rows={3} style={{width:"100%",padding:"0.45rem 0.625rem",borderRadius:"7px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",color:"#f0f0f0",fontSize:"0.56rem",fontFamily:"'JetBrains Mono',monospace",outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
                :<input value={meta[f.k]} onChange={e=>setMeta(m=>({...m,[f.k]:e.target.value}))} placeholder={f.placeholder} style={{width:"100%",padding:"0.45rem 0.625rem",borderRadius:"7px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",color:"#f0f0f0",fontSize:"0.56rem",fontFamily:"'JetBrains Mono',monospace",outline:"none",boxSizing:"border-box"}} onFocus={e=>{e.currentTarget.style.borderColor=`${cfg.color}45`;}} onBlur={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";}}/>}
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:"0.5rem"}}>
          <button onClick={()=>setStep("upload")} style={{padding:"0.75rem 1.25rem",borderRadius:"9px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.3)",fontSize:"0.64rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace"}}>← Back</button>
          <button onClick={()=>setStep("valuation")} disabled={!complete} style={{flex:1,padding:"0.75rem",borderRadius:"9px",border:"none",fontWeight:900,fontSize:"0.72rem",fontFamily:"'JetBrains Mono',monospace",cursor:complete?"pointer":"not-allowed",background:complete?`linear-gradient(135deg,${cfg.color},#14F195)`:"rgba(255,255,255,0.04)",color:complete?"#000":"rgba(255,255,255,0.2)",transition:"all 0.2s"}}>Continue to Valuation →</button>
        </div>
      </div>
    );
  }

  // ─── VALUATION ─────────────────────────────────────────────────────────────
  if(step==="valuation"){
    const complete=!!(val.estimatedUsd&&parseFloat(val.estimatedUsd)>0);
    return (
      <div style={{padding:"1.25rem",maxWidth:"680px"}}>
        <StepBar step="valuation"/>
        <CustodySafetyBanner/>
        <div style={{marginBottom:"1.25rem"}}>
          <p style={{fontSize:"0.44rem",letterSpacing:"0.2em",color:"rgba(20,241,149,0.5)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",margin:"0 0 0.3rem"}}>Studio · Step 3 of 7 · Valuation</p>
          <h2 style={{fontWeight:900,fontSize:"1.3rem",color:"#f0f0f0",margin:"0 0 0.35rem",letterSpacing:"-0.025em"}}>Set Your Valuation</h2>
          <p style={{fontSize:"0.56rem",color:"rgba(255,255,255,0.4)",margin:0,lineHeight:1.7}}>Your declared valuation determines LTV and borrowing capacity on Loopscale. Abraxas uses a hybrid oracle model — market comps + custodian-verified pricing.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.625rem",marginBottom:"1rem"}}>
          <div style={{gridColumn:"1 / -1"}}>
            <label style={{display:"block",fontSize:"0.44rem",fontWeight:700,color:"rgba(255,255,255,0.45)",marginBottom:"0.25rem",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.06em"}}>Estimated Market Value (USD) *</label>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:"0.75rem",top:"50%",transform:"translateY(-50%)",fontSize:"0.62rem",color:"rgba(255,255,255,0.4)",fontFamily:"'JetBrains Mono',monospace"}}>$</span>
              <input type="number" value={val.estimatedUsd} onChange={e=>setVal(v=>({...v,estimatedUsd:e.target.value}))} placeholder="0.00" style={{width:"100%",padding:"0.65rem 0.75rem 0.65rem 1.5rem",borderRadius:"8px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.1)",color:"#f0f0f0",fontSize:"0.82rem",fontFamily:"'JetBrains Mono',monospace",outline:"none",boxSizing:"border-box",fontWeight:700}} onFocus={e=>{e.currentTarget.style.borderColor=`${cfg.color}50`;}} onBlur={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";}}/>
            </div>
          </div>
          {([{k:"referenceSource" as const,label:"Valuation Reference",ph:"e.g. Heritage Auctions, PWCC, eBay recent sale"},{k:"insurer" as const,label:"Insurance Source (optional)",ph:"e.g. Collectors Insurance, Lloyd's"}] as const).map(f=>(
            <div key={f.k}>
              <label style={{display:"block",fontSize:"0.44rem",fontWeight:700,color:"rgba(255,255,255,0.45)",marginBottom:"0.22rem",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.06em"}}>{f.label}</label>
              <input value={val[f.k]} onChange={e=>setVal(v=>({...v,[f.k]:e.target.value}))} placeholder={f.ph} style={{width:"100%",padding:"0.45rem 0.625rem",borderRadius:"7px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",color:"#f0f0f0",fontSize:"0.54rem",fontFamily:"'JetBrains Mono',monospace",outline:"none",boxSizing:"border-box"}}/>
            </div>
          ))}
        </div>
        {complete&&(
          <div style={{padding:"0.875rem 1rem",background:"rgba(20,241,149,0.05)",border:"1px solid rgba(20,241,149,0.15)",borderRadius:"10px",marginBottom:"1rem",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.75rem"}}>
            {([["Declared Value",`$${parseInt(val.estimatedUsd).toLocaleString()}`,"rgba(255,255,255,0.7)"],["Max Borrow",`$${borrowMax.toLocaleString()} USDC`,"#14F195"],["LTV Cap",`${cfg.ltv}%`,"#14F195"]] as [string,string,string][]).map(([l,v,c])=>(
              <div key={l} style={{textAlign:"center"}}><div style={{fontSize:"0.4rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",marginBottom:"2px"}}>{l}</div><div style={{fontSize:"0.82rem",fontWeight:900,color:c,fontFamily:"'JetBrains Mono',monospace"}}>{v}</div></div>
            ))}
          </div>
        )}
        <div style={{display:"flex",gap:"0.5rem"}}>
          <button onClick={()=>setStep("metadata")} style={{padding:"0.75rem 1.25rem",borderRadius:"9px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.3)",fontSize:"0.64rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace"}}>← Back</button>
          <button onClick={()=>setStep("wallet")} disabled={!complete} style={{flex:1,padding:"0.75rem",borderRadius:"9px",border:"none",fontWeight:900,fontSize:"0.72rem",fontFamily:"'JetBrains Mono',monospace",cursor:complete?"pointer":"not-allowed",background:complete?`linear-gradient(135deg,${cfg.color},#14F195)`:"rgba(255,255,255,0.04)",color:complete?"#000":"rgba(255,255,255,0.2)",transition:"all 0.2s"}}>Continue to Wallet →</button>
        </div>
      </div>
    );
  }

  // ─── WALLET ────────────────────────────────────────────────────────────────
  if(step==="wallet") return (
    <div style={{padding:"1.25rem",maxWidth:"480px"}}>
      <StepBar step="wallet"/>
      <p style={{fontSize:"0.44rem",letterSpacing:"0.2em",color:"rgba(20,241,149,0.5)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",margin:"0 0 0.5rem"}}>Studio · Step 4 of 7 · Wallet Authorization</p>
      <h2 style={{fontWeight:900,fontSize:"1.3rem",color:"#f0f0f0",margin:"0 0 0.75rem",letterSpacing:"-0.025em"}}>Authorize Your Wallet</h2>
      {connected?(
        <div>
          <div style={{padding:"1rem",background:"rgba(20,241,149,0.07)",border:"1px solid rgba(20,241,149,0.25)",borderRadius:"10px",marginBottom:"1rem"}}>
            <div style={{fontSize:"0.44rem",color:"rgba(20,241,149,0.6)",fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.2rem",textTransform:"uppercase",letterSpacing:"0.08em"}}>Wallet Connected</div>
            <div style={{fontSize:"0.68rem",fontWeight:700,color:"#14F195",fontFamily:"'JetBrains Mono',monospace"}}>{publicKey?.toBase58().slice(0,4)}…{publicKey?.toBase58().slice(-4)}</div>
          </div>
          <p style={{fontSize:"0.56rem",color:"rgba(255,255,255,0.4)",lineHeight:1.7,margin:"0 0 1.25rem"}}>Your wallet will sign the issuance transaction and authorize the $ABRA mint fee. This creates the on-chain position binding your wallet to the asset.</p>
          <div style={{display:"flex",gap:"0.5rem"}}>
            <button onClick={()=>setStep("valuation")} style={{padding:"0.75rem 1.25rem",borderRadius:"9px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.3)",fontSize:"0.64rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace"}}>← Back</button>
            <button onClick={()=>setStep("fee")} style={{flex:1,padding:"0.75rem",borderRadius:"9px",border:"none",fontWeight:900,fontSize:"0.72rem",fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",background:"linear-gradient(135deg,#14F195,#C8A96E)",color:"#000",boxShadow:"0 0 20px rgba(20,241,149,0.3)"}}>Review Mint Fee →</button>
          </div>
        </div>
      ):(
        <div>
          <p style={{fontSize:"0.58rem",color:"rgba(255,255,255,0.45)",lineHeight:1.7,margin:"0 0 1.25rem"}}>Connect your Solana wallet to authorize the issuance transaction. Your wallet becomes the controlling authority for the tokenized asset.</p>
          <button onClick={()=>setVisible(true)} style={{width:"100%",padding:"0.875rem",borderRadius:"10px",border:"none",fontWeight:900,fontSize:"0.72rem",fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",background:"linear-gradient(135deg,#9945FF,#14F195)",color:"#fff",boxShadow:"0 0 24px rgba(153,69,255,0.35)",marginBottom:"0.75rem"}}>Connect Wallet</button>
          <button onClick={()=>setStep("valuation")} style={{width:"100%",padding:"0.5rem",borderRadius:"7px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.28)",fontSize:"0.58rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace"}}>← Back</button>
        </div>
      )}
    </div>
  );

  // ─── FEE CONFIRMATION ──────────────────────────────────────────────────────
  if(step==="fee") return (
    <div style={{padding:"1.25rem",maxWidth:"480px"}}>
      <StepBar step="fee"/>
      <p style={{fontSize:"0.44rem",letterSpacing:"0.2em",color:"rgba(20,241,149,0.5)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",margin:"0 0 0.5rem"}}>Studio · Step 5 of 7 · Mint Fee</p>
      <h2 style={{fontWeight:900,fontSize:"1.3rem",color:"#f0f0f0",margin:"0 0 0.25rem",letterSpacing:"-0.025em"}}>Confirm $ABRA Mint Fee</h2>
      <p style={{fontSize:"0.56rem",color:"rgba(255,255,255,0.4)",lineHeight:1.7,margin:"0 0 0.75rem"}}>The mint fee is deducted from your $ABRA balance and permanently consumed — spam resistance and issuance legitimacy.</p>
      {/* Balance */}
      <div style={{padding:"0.4rem 0.75rem",background:abraBalance>=(abraFee+10)?"rgba(20,241,149,0.05)":"rgba(242,107,107,0.05)",border:`1px solid ${abraBalance>=(abraFee+10)?"rgba(20,241,149,0.18)":"rgba(242,107,107,0.25)"}`,borderRadius:"7px",marginBottom:"0.875rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.4)"}}>Your $ABRA balance</span>
        <div style={{textAlign:"right"}}>
          <span style={{fontSize:"0.72rem",fontWeight:800,color:abraBalance>=(abraFee+10)?"#14F195":"#f26b6b",fontFamily:"'JetBrains Mono',monospace"}}>{abraBalance.toLocaleString()} $ABRA</span>
          <span style={{fontSize:"0.44rem",color:"rgba(255,255,255,0.3)",marginLeft:"0.4rem"}}>(~${(abraBalance*abraUsdPrice).toFixed(2)} USD)</span>
          {abraBalance<(abraFee+10)&&<div style={{fontSize:"0.42rem",color:"#f26b6b",marginTop:"1px"}}>Insufficient — need {(abraFee+10)-abraBalance} more</div>}
        </div>
      </div>
      {/* Vault routing */}
      {vaultAlloc&&(
        <div style={{marginBottom:"0.875rem",padding:"0.625rem 0.875rem",background:"rgba(200,169,110,0.05)",border:"1px solid rgba(200,169,110,0.15)",borderRadius:"9px"}}>
          <div style={{fontSize:"0.42rem",fontWeight:700,color:"rgba(200,169,110,0.6)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"0.4rem"}}>Where Your $ABRA Goes</div>
          <div style={{display:"flex",flexDirection:"column",gap:"0.22rem"}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:"0.48rem",color:"rgba(255,255,255,0.45)"}}>Protocol Treasury (Main Vault)</span><span style={{fontSize:"0.52rem",fontWeight:700,color:"#C8A96E",fontFamily:"'JetBrains Mono',monospace"}}>{vaultAlloc.mainVault.amount} $ABRA ({vaultAlloc.mainVault.pct}%)</span></div>
            {vaultAlloc.classVault.amount>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:"0.48rem",color:"rgba(255,255,255,0.45)"}}>{assetClass} Class Vault</span><span style={{fontSize:"0.52rem",fontWeight:700,color:"#6b8cff",fontFamily:"'JetBrains Mono',monospace"}}>{vaultAlloc.classVault.amount} $ABRA (20%)</span></div>}
          </div>
        </div>
      )}
      {/* Fee breakdown */}
      <div style={{background:"rgba(6,8,16,0.99)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"12px",overflow:"hidden",marginBottom:"1.25rem"}}>
        {([[`${assetClass} Issuance`,`${abraFee} $ABRA`,"#C8A96E"],["Verification Queue Fee","10 $ABRA","rgba(255,255,255,0.5)"],["Solana Network Fee","~0.000005 SOL","rgba(255,255,255,0.5)"]]).map(([l,v,c],i)=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"0.625rem 0.875rem",borderBottom:i<2?"1px solid rgba(255,255,255,0.04)":"none"}}>
            <span style={{fontSize:"0.56rem",color:"rgba(255,255,255,0.45)"}}>{l}</span>
            <span style={{fontSize:"0.56rem",fontWeight:700,color:c as string,fontFamily:"'JetBrains Mono',monospace"}}>{v}</span>
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"space-between",padding:"0.75rem 0.875rem",background:"rgba(200,169,110,0.05)",borderTop:"1px solid rgba(200,169,110,0.1)"}}>
          <span style={{fontSize:"0.62rem",fontWeight:700,color:"rgba(255,255,255,0.7)"}}>Total</span>
          <span style={{fontSize:"0.72rem",fontWeight:900,color:"#C8A96E",fontFamily:"'JetBrains Mono',monospace"}}>{abraFee+10} $ABRA</span>
        </div>
      </div>
      {/* What this unlocks */}
      <div style={{padding:"0.75rem",background:"rgba(20,241,149,0.04)",border:"1px solid rgba(20,241,149,0.12)",borderRadius:"9px",marginBottom:"1.25rem"}}>
        <div style={{fontSize:"0.44rem",fontWeight:700,color:"rgba(20,241,149,0.6)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:"0.4rem"}}>This mint fee unlocks</div>
        {["Token-2022 position minted on Solana",`Custody partner notification (${cfg.partner})`,"Verification queue entry","Loopscale eligibility after verification — borrow USDC against your asset","Markets listing access after approval"].map(item=>(
          <div key={item} style={{display:"flex",gap:"0.35rem",marginBottom:"0.18rem"}}><span style={{color:"rgba(20,241,149,0.5)",flexShrink:0}}>▸</span><span style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.45)"}}>{item}</span></div>
        ))}
      </div>
      <div style={{display:"flex",gap:"0.5rem"}}>
        <button onClick={()=>setStep("wallet")} style={{padding:"0.75rem 1.25rem",borderRadius:"9px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.3)",fontSize:"0.64rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace"}}>← Back</button>
        <button onClick={processMint} disabled={abraBalance<(abraFee+10)} style={{flex:1,padding:"0.875rem",borderRadius:"10px",border:"none",fontWeight:900,fontSize:"0.78rem",fontFamily:"'JetBrains Mono',monospace",cursor:abraBalance>=(abraFee+10)?"pointer":"not-allowed",background:abraBalance>=(abraFee+10)?"linear-gradient(135deg,#C8A96E,#FBBF24)":"rgba(255,255,255,0.05)",color:abraBalance>=(abraFee+10)?"#000":"rgba(255,255,255,0.2)",boxShadow:abraBalance>=(abraFee+10)?"0 0 28px rgba(200,169,110,0.4)":"none",letterSpacing:"0.04em",transition:"all 0.2s"}}>
          {abraBalance>=(abraFee+10)?`Confirm — Deduct ${abraFee+10} $ABRA →`:`Need ${(abraFee+10)-abraBalance} more $ABRA`}
        </button>
      </div>
    </div>
  );

  // ─── PROCESSING ────────────────────────────────────────────────────────────
  if(step==="processing") return (
    <div style={{padding:"1.25rem",maxWidth:"480px",minHeight:"60vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center"}}>
      <div style={{width:"56px",height:"56px",borderRadius:"50%",border:"3px solid rgba(200,169,110,0.15)",borderTopColor:"#C8A96E",animation:"spin 0.9s linear infinite",marginBottom:"1.5rem"}}/>
      <h3 style={{fontWeight:900,fontSize:"1.1rem",color:"#f0f0f0",margin:"0 0 0.5rem",letterSpacing:"-0.02em"}}>Minting on Solana</h3>
      <p style={{fontSize:"0.58rem",color:"rgba(255,255,255,0.38)",lineHeight:1.7,maxWidth:"320px",margin:"0 0 1.5rem"}}>Creating Token-2022 position · Anchoring metadata · Notifying custody partner · Entering verification queue</p>
      <div style={{display:"flex",gap:"0.3rem"}}>
        {[0,1,2,3,4].map(i=><div key={i} style={{width:"4px",height:"4px",borderRadius:"50%",background:"#C8A96E",animation:`bounce 0.8s ease-in-out ${i*0.12}s infinite`}}/>)}
      </div>
    </div>
  );

  // ─── VERIFICATION QUEUE ────────────────────────────────────────────────────
  if(step==="queue") return (
    <div style={{padding:"1.25rem",maxWidth:"600px"}}>
      <StepBar step="queue"/>
      <div style={{marginBottom:"1.5rem"}}>
        <p style={{fontSize:"0.44rem",letterSpacing:"0.2em",color:"rgba(20,241,149,0.5)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",margin:"0 0 0.3rem"}}>Studio · Step 7 of 7 · Verification Queue</p>
        <h2 style={{fontWeight:900,fontSize:"1.3rem",color:"#f0f0f0",margin:"0 0 0.35rem",letterSpacing:"-0.025em"}}>Asset Queued for Verification</h2>
        <p style={{fontSize:"0.56rem",color:"rgba(255,255,255,0.42)",margin:0,lineHeight:1.7}}>Verified assets only become tradable after ownership review. This maintains marketplace trust — every listing is authenticated before reaching Markets.</p>
      </div>
      {/* Mint confirmation */}
      <div style={{padding:"0.75rem 1rem",background:"rgba(20,241,149,0.05)",border:"1px solid rgba(20,241,149,0.2)",borderRadius:"10px",marginBottom:"1.25rem",display:"flex",gap:"1rem",flexWrap:"wrap",alignItems:"center"}}>
        {preview&&<img src={preview} style={{width:"52px",height:"52px",borderRadius:"7px",objectFit:"contain",border:"1px solid rgba(20,241,149,0.2)",flexShrink:0}}/>}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:"0.44rem",color:"rgba(20,241,149,0.6)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",marginBottom:"2px"}}>Token-2022 Minted · {assetClass}</div>
          <div style={{fontSize:"0.72rem",fontWeight:800,color:"#f0f0f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{meta.name||"Asset"}</div>
          <div style={{fontSize:"0.44rem",color:"rgba(255,255,255,0.35)",fontFamily:"'JetBrains Mono',monospace",marginTop:"2px"}}>Tx: {mintTxId||"pending…"}</div>
        </div>
        <div style={{padding:"0.3rem 0.6rem",background:"rgba(20,241,149,0.07)",border:"1px solid rgba(20,241,149,0.15)",borderRadius:"6px",textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:"0.4rem",color:"rgba(20,241,149,0.5)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase"}}>$ABRA Remaining</div>
          <div style={{fontSize:"0.62rem",fontWeight:800,color:"#14F195",fontFamily:"'JetBrains Mono',monospace"}}>{abraBalance.toLocaleString()}</div>
        </div>
      </div>
      {/* Loopscale lending callout */}
      {estUsd>0&&(
        <div style={{marginBottom:"1rem",padding:"0.75rem 1rem",background:"linear-gradient(145deg,rgba(20,241,149,0.07),rgba(6,8,16,0.99))",border:"1px solid rgba(20,241,149,0.2)",borderRadius:"10px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"0.4rem",marginBottom:"0.5rem"}}>
            <div style={{width:"5px",height:"5px",borderRadius:"50%",background:"#14F195",animation:"pulse2 2s ease-in-out infinite"}}/>
            <span style={{fontSize:"0.44rem",fontWeight:800,color:"rgba(20,241,149,0.7)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.08em"}}>Loopscale Lending — Unlocks After Verification</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.4rem",marginBottom:"0.5rem"}}>
            {([["Borrow Up To",`$${borrowMax.toLocaleString()}`, "#14F195"],["Fixed APR","5.2%","#14F195"],["LTV Cap",`${cfg.ltv}%`,"#6b8cff"]] as [string,string,string][]).map(([l,v,c])=>(
              <div key={l} style={{padding:"0.3rem 0.4rem",background:"rgba(6,8,16,0.97)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"6px",textAlign:"center"}}>
                <div style={{fontSize:"0.62rem",fontWeight:900,color:c,fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>{v}</div>
                <div style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",marginTop:"2px"}}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:"0.46rem",color:"rgba(255,255,255,0.38)",lineHeight:1.6}}>Once verified, borrow USDC in minutes. Your asset stays in {cfg.partner} custody. Repay on your timeline. <strong style={{color:"rgba(255,255,255,0.55)"}}>Capital without selling.</strong></div>
        </div>
      )}
      {/* Queue pipeline */}
      <div style={{marginBottom:"1.25rem"}}>
        <div style={{fontSize:"0.44rem",fontWeight:700,color:"rgba(255,255,255,0.35)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"0.625rem"}}>Verification Pipeline</div>
        {QUEUE_STEPS.map((qs,i)=>{
          const done=i<=queueProgress,active=i===queueProgress;
          return (
            <div key={i} style={{display:"flex",gap:"0.625rem",alignItems:"flex-start",marginBottom:"0.5rem",opacity:i>queueProgress+1?0.25:1,transition:"opacity 0.5s"}}>
              <div style={{width:"18px",height:"18px",borderRadius:"50%",flexShrink:0,border:`1.5px solid ${done?"#14F195":"rgba(255,255,255,0.1)"}`,background:done?"#14F195":"transparent",display:"flex",alignItems:"center",justifyContent:"center",marginTop:"1px",transition:"all 0.4s",boxShadow:active?"0 0 8px rgba(20,241,149,0.6)":"none"}}>
                {done&&i<queueProgress&&<div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#000"}}/>}
                {active&&<div style={{width:"5px",height:"5px",borderRadius:"50%",background:"#000",animation:"pulse2 0.8s ease-in-out infinite"}}/>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:"0.58rem",fontWeight:done?600:400,color:done?"#f0f0f0":"rgba(255,255,255,0.35)",lineHeight:1.4,transition:"color 0.3s"}}>{qs}</div>
                {active&&<div style={{fontSize:"0.44rem",color:"rgba(20,241,149,0.6)",fontFamily:"'JetBrains Mono',monospace",marginTop:"2px",animation:"pulse2 1.5s ease-in-out infinite"}}>In progress…</div>}
              </div>
            </div>
          );
        })}
        {queueProgress>=QUEUE_STEPS.length-1&&(
          <div style={{marginTop:"0.625rem",padding:"0.5rem 0.75rem",background:mintedAsset?.status==="listed"?"rgba(20,241,149,0.07)":"rgba(251,191,36,0.07)",border:`1px solid ${mintedAsset?.status==="listed"?"rgba(20,241,149,0.25)":"rgba(251,191,36,0.2)"}`,borderRadius:"7px"}}>
            {mintedAsset?.status==="listed"
              ?<span style={{fontSize:"0.52rem",color:"#14F195",fontWeight:700}}>✓ Verified and listed in Markets — asset is now tradable and collateral eligible</span>
              :mintedAsset?.status==="verified"
              ?<span style={{fontSize:"0.52rem",color:"#14F195",fontWeight:700}}>Verification complete — entering Markets listing queue</span>
              :<span style={{fontSize:"0.52rem",color:"#FBBF24",fontWeight:700}}>Awaiting custodian confirmation — asset appears in Markets as pending preview</span>}
          </div>
        )}
      </div>
      {/* After verification */}
      <div style={{padding:"0.875rem 1rem",background:"rgba(6,8,16,0.98)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"10px",marginBottom:"1rem"}}>
        <div style={{fontSize:"0.44rem",fontWeight:700,color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"0.5rem"}}>After Verification</div>
        {[
          "Asset enters Markets — joins Baxus spirits, Courtyard watches, and LBMA metals already listed",
          `Immediately borrowable on Loopscale: up to $${borrowMax.toLocaleString()} USDC at ${cfg.ltv}% LTV, 5.2% APR fixed`,
          "Hold your asset in verified custody — no need to sell to access capital",
          "$ABRA yield accrues from protocol interactions and collateral activity",
        ].map((t,i)=>(
          <div key={i} style={{display:"flex",gap:"0.35rem",marginBottom:"0.18rem"}}><span style={{fontSize:"0.44rem",color:"rgba(200,169,110,0.5)"}}>{i+1}.</span><span style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.42)",lineHeight:1.5}}>{t}</span></div>
        ))}
      </div>
      <button onClick={()=>{setStep("upload");setFile(null);setPreview(null);setMeta({name:"",grade:"",year:"",condition:"",serialNumber:"",description:""});setVal({estimatedUsd:"",referenceSource:"",insurer:""});setQueueProgress(0);setMintTxId("");setLastAssetId(null);}} style={{width:"100%",padding:"0.625rem",borderRadius:"8px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.32)",fontSize:"0.62rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace"}}>Submit Another Asset →</button>
    </div>
  );

  return null;
}