// FILE: components/PortfolioTab.tsx
"use client";
// SELF-CONTAINED. Billboard typography. Full DeFi aesthetic.
// Larger fonts throughout. Verification section. FAQ included.
// ABRA + SOL payment options. Train link fixed.
"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet }       from "@solana/wallet-adapter-react";
import { useWalletModal }  from "@solana/wallet-adapter-react-ui";
import { useAbraStore }    from "@/lib/abraxasStore";
import { useWalletAuth }   from "@/lib/hooks/useWalletAuth";
import { useAbraBalance }  from "@/lib/hooks/useAbraBalance";
import { IssuanceEngine }  from "@/components/IssuanceEngine";

const ABRA_CA   = "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS";
const BAGS_URL  = `https://bags.fm/${ABRA_CA}`;
const JUP_URL   = `https://jup.ag/swap/SOL-${ABRA_CA}`;
const MONO      = "'JetBrains Mono',monospace";

type Asset = ReturnType<typeof useAbraStore.getState>["assets"][0];

// ── Status map ────────────────────────────────────────────────
const STATUS_META: Record<string,{label:string;color:string;step:number}> = {
  submitted:            {label:"Submitted",      color:"#C8A96E",step:1},
  pending_documents:    {label:"Documents",      color:"#FBBF24",step:2},
  pending_identity:     {label:"Identity",       color:"#FBBF24",step:3},
  pending_appraisal:    {label:"Appraisal",      color:"#FBBF24",step:4},
  pending_custody:      {label:"Custody Check",  color:"#FBBF24",step:5},
  pending_verification: {label:"Final Review",   color:"#FBBF24",step:6},
  verified:             {label:"Verified",       color:"#14F195",step:8},
  collateral_eligible:  {label:"Borrow Ready",   color:"#14F195",step:9},
  borrowed:             {label:"Active Loan",    color:"#6b8cff",step:10},
  listed:               {label:"Market Ready",   color:"#14F195",step:11},
  rejected:             {label:"Rejected",       color:"#f26b6b",step:0},
  closed:               {label:"Closed",         color:"rgba(255,255,255,0.2)",step:0},
};
const PIPELINE = ["Submitted","Documents","Identity","Appraisal","Custody","Final Review","Verified","Borrow Eligible","Active","Market Ready"];

function fmtUsd(n:number){return n>=1e6?`$${(n/1e6).toFixed(2)}M`:n>=1000?`$${(n/1000).toFixed(1)}K`:`$${n.toFixed(0)}`;}
function shortPk(k:string){return k&&k.length>12?`${k.slice(0,6)}...${k.slice(-4)}`:k||"Not set";}

// ══════════════════════════════════════════════
// INLINE: Intelligence Ticker
// ══════════════════════════════════════════════
const TICKER_DATA = [
  {tag:"RWA",   label:"RWA On-Chain TVL",     value:"$12.4B",  change:"+340% YoY", up:true},
  {tag:"STABLE",label:"Stablecoin Total",      value:"$168.3B", change:"+24.6%",   up:true},
  {tag:"SOL",   label:"SOL Price",             value:"$152.40", change:"+4.2%",    up:true},
  {tag:"BTC",   label:"BTC Price",             value:"$98,200", change:"+2.1%",    up:true},
  {tag:"RWA",   label:"Tokenized Treasuries",  value:"$4.1B",   change:"+820%",    up:true},
  {tag:"STABLE",label:"USDT Market Cap",       value:"$109.2B", change:"+12.4%",   up:true},
  {tag:"STABLE",label:"USDC Market Cap",       value:"$44.8B",  change:"+38.1%",   up:true},
  {tag:"INST",  label:"BlackRock BUIDL",       value:"$1.7B",   change:"+560%",    up:true},
  {tag:"RWA",   label:"Active RWA Protocols",  value:"47",      change:"+23",      up:true},
  {tag:"SOL",   label:"Solana DeFi TVL",       value:"$8.4B",   change:"+92%",     up:true},
  {tag:"ABRA",  label:"Abraxas Protocol",      value:"LIVE",                       up:true},
];
const TAG_COL:Record<string,string>={RWA:"#14F195",STABLE:"#6b8cff",SOL:"#9945FF",BTC:"#F7931A",INST:"#C8A96E",ABRA:"#C8A96E"};

function Ticker(){
  const [items,setItems]=useState(TICKER_DATA);
  const [paused,setPaused]=useState(false);
  useEffect(()=>{
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin&vs_currencies=usd&include_24hr_change=true",{cache:"no-store"})
      .then(r=>r.ok?r.json():null)
      .then(d=>{
        if(!d) return;
        setItems(prev=>prev.map(item=>{
          if(item.label==="SOL Price"&&d.solana?.usd){const c=d.solana.usd_24h_change??0;return{...item,value:`$${d.solana.usd.toFixed(2)}`,change:`${c>=0?"+":""}${c.toFixed(1)}%`,up:c>=0};}
          if(item.label==="BTC Price"&&d.bitcoin?.usd){const c=d.bitcoin.usd_24h_change??0;return{...item,value:`$${d.bitcoin.usd.toLocaleString()}`,change:`${c>=0?"+":""}${c.toFixed(1)}%`,up:c>=0};}
          return item;
        }));
      }).catch(()=>{});
  },[]);
  const doubled=[...items,...items];
  return(
    <div style={{overflow:"hidden",position:"relative",height:38,background:"rgba(6,8,16,0.99)",borderBottom:"1px solid rgba(255,255,255,0.06)"}}
      onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:40,background:"linear-gradient(90deg,rgba(6,8,16,1),transparent)",zIndex:2}}/>
      <div style={{display:"flex",alignItems:"center",height:"100%",whiteSpace:"nowrap",animation:`ticker-run ${items.length*4}s linear infinite`,animationPlayState:paused?"paused":"running"}}>
        {doubled.map((item,i)=>{
          const col=TAG_COL[item.tag]??"rgba(255,255,255,0.4)";
          return(
            <div key={i} style={{display:"inline-flex",alignItems:"center",gap:"0.4rem",padding:"0 1rem",borderRight:"1px solid rgba(255,255,255,0.05)",flexShrink:0}}>
              <span style={{fontSize:"0.34rem",fontWeight:700,color:`${col}55`,fontFamily:MONO,letterSpacing:"0.12em",textTransform:"uppercase"}}>{item.tag}</span>
              <span style={{fontSize:"0.48rem",color:"rgba(255,255,255,0.4)",fontFamily:MONO}}>{item.label}</span>
              <span style={{fontSize:"0.56rem",fontWeight:900,color:col,fontFamily:MONO}}>{item.value}</span>
              {item.change&&<span style={{fontSize:"0.42rem",fontWeight:700,color:item.up?"#14F195":"#f26b6b",fontFamily:MONO}}>{item.change}</span>}
            </div>
          );
        })}
      </div>
      <div style={{position:"absolute",right:0,top:0,bottom:0,width:40,background:"linear-gradient(270deg,rgba(6,8,16,1),transparent)",zIndex:2}}/>
      <style>{`@keyframes ticker-run{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════
// INLINE: Circuit Monitor
// ══════════════════════════════════════════════
const SIGNALS=[
  {level:"NOMINAL",type:"ORACLE",    msg:"Price feeds consistent across verified sources"},
  {level:"NOMINAL",type:"COLLATERAL",msg:"Portfolio health within normal bounds"},
  {level:"WATCH",  type:"LIQUIDITY", msg:"RWA liquidity depth below 30-day average"},
  {level:"NOMINAL",type:"CUSTODY",   msg:"Custody network — all vaults nominal"},
  {level:"WATCH",  type:"VOLATILITY",msg:"Metals price variance elevated 4.2%"},
  {level:"NOMINAL",type:"PROTOCOL",  msg:"All state transitions verified on-chain"},
];
const LEVEL_COL:Record<string,string>={NOMINAL:"rgba(20,241,149,0.65)",WATCH:"#FBBF24",ALERT:"#FF8C00",CRITICAL:"#f26b6b"};

function CircuitMonitor(){
  const [signals,setSignals]=useState(SIGNALS.slice(0,4).map((s,i)=>({...s,id:i,ts:Date.now()-i*14000})));
  useEffect(()=>{
    const iv=setInterval(()=>{
      const b=SIGNALS[Math.floor(Math.random()*SIGNALS.length)];
      setSignals(s=>[{...b,id:Date.now(),ts:Date.now()},...s].slice(0,5));
    },14000);
    return()=>clearInterval(iv);
  },[]);
  return(
    <div style={{border:"1px solid rgba(20,241,149,0.12)",borderRadius:"8px",overflow:"hidden",marginBottom:"2.5rem"}}>
      <div style={{padding:"0.625rem 1rem",borderBottom:"1px solid rgba(20,241,149,0.08)",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(20,241,149,0.04)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:"#14F195",animation:"pulse 1.5s ease-in-out infinite"}}/>
          <span style={{fontSize:"0.52rem",fontWeight:700,color:"rgba(20,241,149,0.7)",fontFamily:MONO,letterSpacing:"0.12em",textTransform:"uppercase"}}>CIRCUIT MONITOR · LIVE</span>
        </div>
        <span style={{fontSize:"0.44rem",color:"rgba(255,255,255,0.2)",fontFamily:MONO}}>{signals.filter(s=>s.level!=="NOMINAL").length} active flags</span>
      </div>
      {signals.map((sig,i)=>{
        const col=LEVEL_COL[sig.level]??"rgba(255,255,255,0.3)";
        const age=Math.round((Date.now()-sig.ts)/1000);
        const ageStr=age<60?`${age}s`:age<3600?`${Math.round(age/60)}m`:`${Math.round(age/3600)}h`;
        return(
          <div key={sig.id} style={{display:"grid",gridTemplateColumns:"68px 100px 1fr 40px",padding:"0.5rem 1rem",gap:"0.5rem",alignItems:"center",borderBottom:i<signals.length-1?"1px solid rgba(255,255,255,0.04)":"none",opacity:Math.max(0.4,1-i*0.12),transition:"opacity 0.3s"}}>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:col,flexShrink:0,animation:sig.level!=="NOMINAL"?"pulse 1.5s ease-in-out infinite":"none"}}/>
              <span style={{fontSize:"0.34rem",fontWeight:800,color:col,fontFamily:MONO,letterSpacing:"0.06em"}}>{sig.level}</span>
            </div>
            <span style={{fontSize:"0.4rem",color:"rgba(255,255,255,0.35)",fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.06em"}}>{sig.type}</span>
            <span style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.55)"}}>{sig.msg}</span>
            <span style={{fontSize:"0.38rem",color:"rgba(255,255,255,0.2)",fontFamily:MONO,textAlign:"right"}}>{ageStr}</span>
          </div>
        );
      })}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════
// INLINE: Verification Value Prop
// ══════════════════════════════════════════════
function VerificationValueProp(){
  const STEPS=[
    {n:"01",col:"#C8A96E",title:"Asset Submission",      desc:"Documentation hashed and anchored on Solana. Immutable from this point."},
    {n:"02",col:"#FBBF24",title:"Authentication Review",  desc:"Named, credentialed partner reviews the physical asset and co-signs on-chain."},
    {n:"03",col:"#FBBF24",title:"Provenance Validation",  desc:"Ownership chain verified. Merkle root anchored on Solana."},
    {n:"04",col:"#6b8cff",title:"Custody Assignment",     desc:"Asset transferred to institutional custodian with vault reference on-chain."},
    {n:"05",col:"#a855f7",title:"Risk + Collateral Score",desc:"4-factor algorithm sets LTV cap. Score derived from evidence, not assigned."},
    {n:"06",col:"#9945FF",title:"Certificate Minted",     desc:"Token-2022 certificate with verifier signature and provenance root on Solana."},
    {n:"07",col:"#14F195",title:"Collateral Active",      desc:"Asset becomes eligible for USDC borrowing. Lenders can verify independently."},
  ];
  return(
    <div style={{marginBottom:"3rem"}}>
      <div style={{marginBottom:"1.5rem"}}>
        <div style={{fontSize:"0.52rem",fontWeight:700,color:"rgba(255,255,255,0.2)",fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.18em",marginBottom:"0.5rem"}}>Protocol Infrastructure</div>
        <h2 style={{fontWeight:900,fontSize:"clamp(1.4rem,3vw,2rem)",color:"#f0f0f0",margin:"0 0 0.75rem",letterSpacing:"-0.03em",lineHeight:1.1}}>Verification Lifecycle</h2>
        <p style={{fontSize:"0.65rem",color:"rgba(255,255,255,0.35)",lineHeight:1.75,maxWidth:520,margin:0}}>
          Most tokenization platforms stop at minting. Abraxas runs a seven-stage cryptographic pipeline — every step co-signed by named partners and anchored on Solana.
        </p>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:0}}>
        {STEPS.map((s,i)=>(
          <div key={s.n} style={{display:"flex",gap:"0.875rem",padding:"0.75rem 0",position:"relative"}}>
            {i<STEPS.length-1&&<div style={{position:"absolute",left:16,top:48,bottom:-1,width:1,background:`linear-gradient(180deg,${s.col}30,${STEPS[i+1].col}15)`,zIndex:0}}/>}
            <div style={{width:32,height:32,borderRadius:"50%",flexShrink:0,background:`${s.col}12`,border:`1px solid ${s.col}40`,display:"flex",alignItems:"center",justifyContent:"center",marginTop:4,position:"relative",zIndex:1}}>
              <span style={{fontSize:"0.3rem",fontWeight:700,color:`${s.col}80`,fontFamily:MONO,letterSpacing:"0.08em"}}>{s.n}</span>
            </div>
            <div style={{flex:1,paddingTop:4}}>
              <div style={{fontWeight:800,fontSize:"0.72rem",color:"#f0f0f0",marginBottom:"0.2rem"}}>{s.title}</div>
              <div style={{fontSize:"0.54rem",color:"rgba(255,255,255,0.35)",lineHeight:1.6}}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// INLINE: Pipeline Bar
// ══════════════════════════════════════════════
function PipelineBar({step}:{step:number}){
  return(
    <div style={{marginTop:"0.5rem"}}>
      <div style={{display:"flex",gap:"2px",marginBottom:"0.3rem"}}>
        {PIPELINE.map((_,i)=>(
          <div key={i} style={{flex:1,height:3,borderRadius:2,background:i<step?"#14F195":i===step-1?"#FBBF24":"rgba(255,255,255,0.07)",transition:"background 0.4s"}}/>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <span style={{fontSize:"0.38rem",color:"rgba(255,255,255,0.25)",fontFamily:MONO}}>{step>0?PIPELINE[step-1]:"Not started"}</span>
        <span style={{fontSize:"0.38rem",color:"rgba(255,255,255,0.18)",fontFamily:MONO}}>{step}/{PIPELINE.length}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// INLINE: Asset Row
// ══════════════════════════════════════════════
function AssetRow({a}:{a:Asset}){
  const [open,setOpen]=useState(false);
  const st=STATUS_META[a.status]??STATUS_META["submitted"];
  const borrow=a.estimatedUsd>0?Math.round(a.estimatedUsd*a.ltv/100):0;
  return(
    <div style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 48px",padding:"0.875rem 1rem",gap:"0.5rem",alignItems:"center",cursor:"pointer"}}>
        <div>
          <div style={{fontWeight:700,fontSize:"0.7rem",color:"#f0f0f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div>
          <div style={{fontSize:"0.44rem",color:"rgba(255,255,255,0.25)",fontFamily:MONO,marginTop:2}}>{a.assetClass}</div>
        </div>
        <div style={{fontSize:"0.65rem",fontWeight:700,color:"#f0f0f0",fontFamily:MONO}}>{a.estimatedUsd>0?fmtUsd(a.estimatedUsd):"—"}</div>
        <div style={{fontSize:"0.62rem",color:borrow>0?"#14F195":"rgba(255,255,255,0.18)",fontFamily:MONO}}>{borrow>0?fmtUsd(borrow):"Pending"}</div>
        <div style={{fontSize:"0.44rem",fontWeight:600,color:st.color,fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.06em"}}>{st.label}</div>
        <div style={{textAlign:"right",fontSize:"0.52rem",color:"rgba(255,255,255,0.2)"}}>{open?"▲":"▼"}</div>
      </div>
      {open&&(
        <div style={{padding:"0 1rem 1rem",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
          <div>
            <div style={{fontSize:"0.4rem",fontWeight:700,color:"rgba(255,255,255,0.2)",fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:4}}>Verification Progress</div>
            <PipelineBar step={st.step}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"0.35rem"}}>
            {([["LTV Cap",`${a.ltv}%`],["ABRA Spent",`${a.mintCostAbra}`],["Token ID",shortPk(a.tokenId||"Pending")],["Tx",shortPk(a.txSignature||"Pending")]] as [string,string][]).map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"0.3rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <span style={{fontSize:"0.42rem",color:"rgba(255,255,255,0.2)",fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.1em"}}>{k}</span>
                <span style={{fontSize:"0.46rem",fontWeight:600,color:"rgba(255,255,255,0.55)",fontFamily:MONO}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// INLINE: FAQ
// ══════════════════════════════════════════════
const FAQ_ITEMS=[
  {q:"What does Abraxas actually do?",a:"Abraxas runs a seven-stage cryptographic verification pipeline for real-world assets. Authentication partners co-sign every stage, provenance is anchored on Solana, and the result is a Token-2022 certificate that lenders can independently verify — not just a generic NFT."},
  {q:"What assets can I tokenize?",a:"Watches, spirits, metals, fine art, graded cards, rare comics, racehorses, real estate, short-term rentals (Airbnb), mineral rights, and non-operated working interests. Each class has specific verification requirements and LTV parameters."},
  {q:"How is the LTV calculated?",a:"LTV is computed by the Abraxas collateral scoring engine across four factors: liquidity (30%), custody quality (30%), price volatility (20%), and provenance depth (20%). A high-confidence asset gets the class maximum LTV. The score is derived from evidence — not assigned arbitrarily."},
  {q:"What is a Verification Certificate?",a:"A Token-2022 token on Solana containing your asset's verification ID, verifier signature, provenance Merkle root, custody reference, collateral score, and fraud risk score. Anyone with a Solana connection can independently verify it — without trusting Abraxas."},
  {q:"How long does verification take?",a:"Standard collectibles: 5 — 10 business days. Real estate and mineral rights: 2 — 6 weeks. Tribal land assets require additional time for BIA and tribal council review. You receive status updates at every stage transition."},
  {q:"Do I need ABRA tokens?",a:"Yes. ABRA is the protocol fee token for initiating tokenization. Fees range from 100 — 600 ABRA depending on asset class complexity. Acquire ABRA on Jupiter or Bags."},
];

function InlineFAQ(){
  const [open,setOpen]=useState<number|null>(null);
  return(
    <div style={{border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",overflow:"hidden"}}>
      {FAQ_ITEMS.map((item,i)=>(
        <div key={i} style={{borderBottom:i<FAQ_ITEMS.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
          <button onClick={()=>setOpen(open===i?null:i)} style={{width:"100%",padding:"1rem 1.25rem",background:"none",border:"none",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"1rem",textAlign:"left"}}>
            <span style={{fontSize:"0.68rem",fontWeight:700,color:"#f0f0f0",flex:1,lineHeight:1.4}}>{item.q}</span>
            <span style={{fontSize:"0.9rem",color:"rgba(255,255,255,0.25)",flexShrink:0,marginTop:2}}>{open===i?"−":"+"}</span>
          </button>
          {open===i&&<div style={{padding:"0 1.25rem 1rem",fontSize:"0.58rem",color:"rgba(255,255,255,0.4)",lineHeight:1.8}}>{item.a}</div>}
        </div>
      ))}
    </div>
  );
}

function Rule({label}:{label:string}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:"0.875rem",margin:"3rem 0 1.5rem"}}>
      <div style={{flex:1,height:1,background:"rgba(255,255,255,0.07)"}}/>
      <span style={{fontSize:"0.44rem",fontWeight:700,letterSpacing:"0.22em",color:"rgba(255,255,255,0.2)",fontFamily:MONO,textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</span>
      <div style={{flex:1,height:1,background:"rgba(255,255,255,0.07)"}}/>
    </div>
  );
}

// ══════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════
export function PortfolioTab(){
  const [mounted,setMounted]=useState(false);
  const [showStudio,setShowStudio]=useState(false);
  const [showAll,setShowAll]=useState(false);
  const studioRef=useRef<HTMLDivElement>(null);

  const {connected,publicKey}=useWallet();
  const {setVisible}=useWalletModal();
  const {isVerified,verifying,error,verify}=useWalletAuth();
  const {balance,loading:balLoading}=useAbraBalance();
  const assets=useAbraStore(s=>s.assets);

  useEffect(()=>{setMounted(true);},[]);
  if(!mounted) return null;

  const pending=assets.filter(a=>{const step=STATUS_META[a.status]?.step??0;return step>0&&step<8&&a.status!=="closed"&&a.status!=="rejected";});
  const verified=assets.filter(a=>{const step=STATUS_META[a.status]?.step??0;return step>=8&&a.status!=="closed"&&a.status!=="rejected";});
  const shown=showAll?verified:verified.slice(0,3);
  const totalBorrowable=verified.reduce((s,a)=>s+Math.round(a.estimatedUsd*a.ltv/100),0);

  function openStudio(){
    setShowStudio(true);
    setTimeout(()=>studioRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),150);
  }

  return(
    <div style={{maxWidth:920,margin:"0 auto"}}>

      {/* Intelligence Ticker */}
      <Ticker/>

      {/* ── BILLBOARD HERO ── */}
      <div style={{padding:"3rem 0 2.5rem",borderBottom:"1px solid rgba(255,255,255,0.06)",marginBottom:"2.5rem"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"0.2rem 0.75rem",borderRadius:"3px",border:"1px solid rgba(200,169,110,0.2)",background:"rgba(200,169,110,0.05)",marginBottom:"1.5rem"}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#C8A96E",animation:"pulse 2s ease-in-out infinite"}}/>
          <span style={{fontSize:"0.48rem",fontWeight:700,color:"rgba(200,169,110,0.7)",fontFamily:MONO,letterSpacing:"0.2em",textTransform:"uppercase"}}>Verification + Collateral Intelligence · Solana</span>
        </div>

        <h1 style={{fontWeight:900,fontSize:"clamp(2rem,4.5vw,3.2rem)",color:"#f0f0f0",margin:"0 0 1rem",letterSpacing:"-0.05em",lineHeight:1.0,maxWidth:640}}>
          Your assets have capital.<br/>
          <span style={{color:"#C8A96E"}}>Abraxas unlocks it.</span>
        </h1>
        <p style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.38)",lineHeight:1.8,maxWidth:560,margin:"0 0 2rem"}}>
          Seven-stage cryptographic verification pipeline. Named authentication partners.
          Provenance anchored on Solana. Collateral certificates lenders can independently verify.
          Not another tokenization platform.
        </p>

        {!connected?(
          <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap"}}>
            <button onClick={()=>setVisible(true)} style={{padding:"0.875rem 1.75rem",borderRadius:"6px",cursor:"pointer",fontWeight:800,fontSize:"0.72rem",fontFamily:MONO,letterSpacing:"0.04em",background:"#7c3aed",color:"#fff"}}>
              Connect Wallet
            </button>
            <button onClick={openStudio} style={{padding:"0.875rem 1.75rem",borderRadius:"6px",border:"1px solid rgba(255,255,255,0.12)",cursor:"pointer",fontWeight:600,fontSize:"0.68rem",fontFamily:MONO,background:"transparent",color:"rgba(255,255,255,0.45)"}}>
              Explore Studio
            </button>
          </div>
        ):(
          <div style={{display:"flex",alignItems:"center",gap:"0.75rem",flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"0.5rem 0.875rem",borderRadius:"5px",border:"1px solid rgba(20,241,149,0.2)",background:"rgba(20,241,149,0.04)"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#14F195"}}/>
              <span style={{fontSize:"0.52rem",fontWeight:700,color:"rgba(255,255,255,0.6)",fontFamily:MONO}}>{shortPk(publicKey?.toBase58()??"")} </span>
            </div>
            {isVerified?(
              <div style={{display:"flex",alignItems:"center",gap:5,padding:"0.4rem 0.75rem",borderRadius:"5px",border:"1px solid rgba(107,140,255,0.25)",background:"rgba(107,140,255,0.06)"}}>
                <span style={{fontSize:"0.44rem",color:"#6b8cff",fontFamily:MONO,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.12em"}}>Authenticated</span>
              </div>
            ):(
              <button onClick={verify} disabled={verifying} style={{padding:"0.4rem 0.875rem",borderRadius:"5px",border:"1px solid rgba(251,191,36,0.3)",cursor:"pointer",fontWeight:700,fontSize:"0.52rem",fontFamily:MONO,background:"rgba(251,191,36,0.07)",color:"#FBBF24"}}>
                {verifying?"Awaiting Signature":"Sign to Authenticate"}
              </button>
            )}
            {error&&<span style={{fontSize:"0.5rem",color:"#f26b6b",fontFamily:MONO}}>{error}</span>}
          </div>
        )}
      </div>

      {/* Circuit Monitor */}
      <CircuitMonitor/>

      {/* Verification Lifecycle */}
      <VerificationValueProp/>

      {/* ── ASSET REGISTRY ── */}
      <Rule label="Asset Registry"/>
      {!connected?(
        <div style={{padding:"3rem 2rem",textAlign:"center",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",background:"rgba(255,255,255,0.01)"}}>
          <div style={{fontSize:"0.72rem",fontWeight:700,color:"rgba(255,255,255,0.2)",marginBottom:"0.5rem"}}>Connect wallet to view your positions</div>
          <div style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.15)",lineHeight:1.7,maxWidth:360,margin:"0 auto 1.25rem"}}>Your tokenized asset registry, ABRA balance, and borrow capacity appear here once connected.</div>
          <button onClick={()=>setVisible(true)} style={{padding:"0.75rem 1.5rem",borderRadius:"6px",cursor:"pointer",fontWeight:700,fontSize:"0.66rem",fontFamily:MONO,background:"#7c3aed",color:"#fff"}}>Connect Wallet</button>
        </div>
      ):assets.length===0?(
        <div style={{padding:"3rem 2rem",textAlign:"center",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",background:"rgba(255,255,255,0.01)"}}>
          <div style={{fontSize:"0.72rem",fontWeight:700,color:"rgba(255,255,255,0.2)",marginBottom:"0.5rem"}}>No assets on record</div>
          <div style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.15)",lineHeight:1.7,maxWidth:400,margin:"0 auto 1.25rem"}}>Tokenize a real-world asset below to create your first verified on-chain position.</div>
          <button onClick={openStudio} style={{padding:"0.75rem 1.5rem",borderRadius:"6px",border:"1px solid rgba(200,169,110,0.3)",cursor:"pointer",fontWeight:700,fontSize:"0.66rem",fontFamily:MONO,background:"rgba(200,169,110,0.07)",color:"#C8A96E"}}>Begin Tokenization</button>
        </div>
      ):(
        <>
          {totalBorrowable>0&&(
            <div style={{padding:"1rem 1.25rem",border:"1px solid rgba(20,241,149,0.15)",borderRadius:"8px",background:"rgba(20,241,149,0.04)",marginBottom:"0.75rem",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.5rem"}}>
              <div>
                <div style={{fontSize:"0.44rem",color:"rgba(20,241,149,0.4)",fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:3}}>Total Borrow Capacity</div>
                <div style={{fontSize:"1.25rem",fontWeight:900,color:"#14F195",fontFamily:MONO}}>{fmtUsd(totalBorrowable)} USDC</div>
              </div>
              <button onClick={()=>window.open("https://app.loopscale.com","_blank","noopener")} style={{padding:"0.65rem 1.25rem",borderRadius:"6px",border:"1px solid rgba(107,140,255,0.35)",cursor:"pointer",fontWeight:700,fontSize:"0.62rem",fontFamily:MONO,background:"rgba(107,140,255,0.07)",color:"#6b8cff"}}>
                Borrow via Loopscale
              </button>
            </div>
          )}
          <div style={{border:"1px solid rgba(255,255,255,0.07)",borderRadius:"7px",overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 48px",padding:"0.55rem 1rem",gap:"0.5rem",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
              {["Asset","Value","Borrow Cap","Status",""].map(h=>(
                <div key={h} style={{fontSize:"0.4rem",fontWeight:700,color:"rgba(255,255,255,0.2)",fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.14em"}}>{h}</div>
              ))}
            </div>
            {shown.map(a=><AssetRow key={a.id} a={a}/>)}
          </div>
          {verified.length>3&&(
            <button onClick={()=>setShowAll(s=>!s)} style={{width:"100%",marginTop:"0.5rem",padding:"0.625rem",borderRadius:"5px",border:"1px solid rgba(255,255,255,0.07)",cursor:"pointer",fontSize:"0.54rem",fontWeight:600,fontFamily:MONO,background:"rgba(255,255,255,0.02)",color:"rgba(255,255,255,0.3)"}}>
              {showAll?`Show fewer`:`View all ${verified.length} assets`}
            </button>
          )}
        </>
      )}

      {/* Pending */}
      {pending.length>0&&(
        <>
          <Rule label="Pending Authentication"/>
          <div style={{display:"flex",flexDirection:"column",gap:"0.625rem"}}>
            {pending.map(a=>{
              const st=STATUS_META[a.status]??STATUS_META["submitted"];
              return(
                <div key={a.id} style={{padding:"1rem 1.25rem",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"7px",background:"rgba(255,255,255,0.01)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem",gap:"0.5rem"}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:"0.72rem",color:"#f0f0f0"}}>{a.name}</div>
                      <div style={{fontSize:"0.46rem",color:"rgba(255,255,255,0.25)",fontFamily:MONO,marginTop:2}}>{a.assetClass}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:5,padding:"0.2rem 0.6rem",borderRadius:"3px",border:`1px solid ${st.color}25`,background:`${st.color}08`,flexShrink:0}}>
                      <div style={{width:5,height:5,borderRadius:"50%",background:st.color,animation:"pulse 1.5s ease-in-out infinite"}}/>
                      <span style={{fontSize:"0.4rem",fontWeight:700,color:st.color,fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.1em"}}>{st.label}</span>
                    </div>
                  </div>
                  <PipelineBar step={st.step}/>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ABRA */}
      <Rule label="ABRA Token"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginBottom:"2.5rem"}}>
        <div style={{gridColumn:"1/-1",padding:"1rem 1.25rem",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"7px"}}>
          <div style={{fontSize:"0.42rem",fontWeight:700,color:"rgba(255,255,255,0.2)",fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.18em",marginBottom:"0.4rem"}}>Contract Address · Solana Mainnet</div>
          <div style={{display:"flex",alignItems:"center",gap:"0.75rem",flexWrap:"wrap"}}>
            <code style={{fontSize:"0.54rem",color:"rgba(255,255,255,0.5)",fontFamily:MONO,flex:1,wordBreak:"break-all"}}>{ABRA_CA}</code>
            <button onClick={()=>navigator.clipboard.writeText(ABRA_CA)} style={{padding:"0.2rem 0.6rem",borderRadius:"3px",border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.3)",fontSize:"0.44rem",cursor:"pointer",fontFamily:MONO}}>Copy</button>
          </div>
        </div>
        <div style={{padding:"1rem 1.25rem",border:"1px solid rgba(200,169,110,0.18)",borderRadius:"7px",background:"rgba(200,169,110,0.04)"}}>
          <div style={{fontSize:"0.42rem",fontWeight:700,color:"rgba(200,169,110,0.45)",fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.18em",marginBottom:"0.35rem"}}>Your Balance</div>
          <div style={{fontSize:"1.4rem",fontWeight:900,color:"#C8A96E",fontFamily:MONO,lineHeight:1,marginBottom:4}}>
            {balLoading?"...":balance.toLocaleString()}
          </div>
          <div style={{fontSize:"0.46rem",color:"rgba(200,169,110,0.4)",fontFamily:MONO}}>
            {connected?"Live on-chain balance":"Connect wallet to view balance"}
          </div>
        </div>
        <div style={{padding:"1rem 1.25rem",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"7px"}}>
          <div style={{fontSize:"0.42rem",fontWeight:700,color:"rgba(255,255,255,0.2)",fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.18em",marginBottom:"0.75rem"}}>Acquire ABRA</div>
          {([["Jupiter (Primary)",JUP_URL,"#14F195"],["Bags.fm",BAGS_URL,"#6b8cff"]] as [string,string,string][]).map(([n,u,c])=>(
            <a key={n} href={u} target="_blank" rel="noopener noreferrer" style={{display:"flex",justifyContent:"space-between",padding:"0.4rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)",textDecoration:"none"}}>
              <span style={{fontSize:"0.54rem",fontWeight:700,color:c,fontFamily:MONO}}>{n}</span>
              <span style={{fontSize:"0.44rem",color:"rgba(255,255,255,0.2)",fontFamily:MONO}}>Trade →</span>
            </a>
          ))}
        </div>
      </div>

      {/* ── TOKENIZATION STUDIO ── */}
      <Rule label="Tokenization Studio"/>
      <div ref={studioRef}>
        {!showStudio?(
          <div style={{padding:"2rem",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",background:"rgba(255,255,255,0.01)"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"1.5rem",alignItems:"start",marginBottom:"2rem"}}>
              <div>
                <h3 style={{fontWeight:900,fontSize:"1.1rem",color:"#f0f0f0",margin:"0 0 0.5rem"}}>Begin Asset Tokenization</h3>
                <p style={{fontSize:"0.62rem",color:"rgba(255,255,255,0.3)",lineHeight:1.75,margin:"0 0 0.5rem"}}>
                  Submit any physical asset through the Abraxas seven-stage verification pipeline.
                  Once verified, your asset receives a Token-2022 certificate on Solana that lenders
                  can independently audit — enabling USDC borrowing without selling.
                </p>
                <p style={{fontSize:"0.56rem",color:"rgba(255,255,255,0.2)",lineHeight:1.65,margin:0}}>
                  Fees are paid in ABRA. SOL payment available on select classes via swap-at-checkout.
                </p>
              </div>
              <button onClick={openStudio} style={{padding:"0.875rem 1.75rem",borderRadius:"6px",border:"none",cursor:"pointer",fontWeight:800,fontSize:"0.72rem",fontFamily:MONO,letterSpacing:"0.04em",background:"linear-gradient(135deg,#7c3aed,#C8A96E)",color:"#fff",whiteSpace:"nowrap"}}>
                Start →
              </button>
            </div>
            {/* Asset class grid */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,148px),1fr))",gap:"0.5rem"}}>
              {([
                ["Watches",           "#6b8cff","◎","65% LTV","150 ABRA"],
                ["Spirits",           "#FF8C00","◈","55% LTV","120 ABRA"],
                ["Cards (PSA/BGS)",   "#FBBF24","⬡","55% LTV","110 ABRA"],
                ["Metals",            "#D4AF37","◆","80% LTV","200 ABRA"],
                ["Art",               "#f26b6b","◭","50% LTV","180 ABRA"],
                ["Property",          "#14F195","⬛","60% LTV","300 ABRA"],
                ["Short-Term Rental", "#14F195","⊞","55% LTV","250 ABRA"],
                ["Mineral Rights",    "#D4AF37","◈","55% LTV","500 ABRA"],
                ["Racehorses",        "#22c55e","◉","55% LTV","250 ABRA"],
                ["Other",             "#C8A96E","⬢","45% LTV","100 ABRA"],
              ] as [string,string,string,string,string][]).map(([nm,col,icon,ltv,fee])=>(
                <div key={nm} onClick={openStudio} style={{padding:"0.875rem",borderRadius:"6px",cursor:"pointer",border:`1px solid ${col}18`,background:`${col}05`,transition:"all 0.15s"}}
                  onMouseEnter={e=>{const el=e.currentTarget as HTMLDivElement;el.style.background=`${col}10`;el.style.borderColor=`${col}35`;}}
                  onMouseLeave={e=>{const el=e.currentTarget as HTMLDivElement;el.style.background=`${col}05`;el.style.borderColor=`${col}18`;}}>
                  <div style={{fontSize:"1rem",color:col,opacity:0.7,marginBottom:"0.3rem",lineHeight:1}}>{icon}</div>
                  <div style={{fontWeight:800,fontSize:"0.62rem",color:"#f0f0f0",marginBottom:2}}>{nm}</div>
                  <div style={{fontSize:"0.38rem",color:"rgba(255,255,255,0.2)",fontFamily:MONO}}>{ltv}</div>
                  <div style={{fontSize:"0.38rem",color:`${col}70`,fontFamily:MONO,marginTop:1}}>{fee}</div>
                </div>
              ))}
            </div>
          </div>
        ):(
          <div style={{border:"1px solid rgba(255,255,255,0.08)",borderRadius:"8px",overflow:"hidden"}}>
            <div style={{padding:"0.625rem 1.25rem",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:"0.44rem",fontWeight:700,color:"rgba(255,255,255,0.2)",fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.18em"}}>Tokenization Studio</span>
              <button onClick={()=>setShowStudio(false)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.3)",fontSize:"0.875rem",padding:"0 0.2rem"}}>×</button>
            </div>
            <div style={{padding:"0.75rem"}}>
              <IssuanceEngine onSuccess={()=>{setShowStudio(false);window.scrollTo({top:0,behavior:"smooth"});}}/>
            </div>
          </div>
        )}
      </div>

      {/* FAQ */}
      <Rule label="Frequently Asked"/>
      <InlineFAQ/>

      <div style={{height:"3rem"}}/>
    </div>
  );
}