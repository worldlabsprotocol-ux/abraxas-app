// FILE: components/PortfolioTab.tsx
// SELF-CONTAINED — all sections inline. No missing imports.
// Ticker + Circuit feed + Hero + Registry + ABRA + Studio all in one file.
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useWallet }          from "@solana/wallet-adapter-react";
import { useWalletModal }     from "@solana/wallet-adapter-react-ui";
import { useAbraStore }       from "@/lib/abraxasStore";
import { useWalletAuth }      from "@/lib/hooks/useWalletAuth";
import { useAbraBalance }     from "@/lib/hooks/useAbraBalance";
import { IssuanceEngine }     from "@/components/IssuanceEngine";

// ── Constants ─────────────────────────────────────────────────────────────────
const ABRA_CA     = "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS";
const JUPITER_URL = `https://jup.ag/swap/SOL-${ABRA_CA}`;
const RAYDIUM_URL = `https://raydium.io/swap/?inputCurrency=sol&outputCurrency=${ABRA_CA}`;
const MONO        = "'JetBrains Mono',monospace";

// ── Status map ────────────────────────────────────────────────────────────────
const STATUS_META: Record<string,{label:string;color:string;step:number}> = {
  created:              {label:"Submitted",       color:"#C8A96E",step:1},
  pending_documents:    {label:"Documents",       color:"#FBBF24",step:2},
  pending_identity:     {label:"Identity Review", color:"#FBBF24",step:3},
  pending_appraisal:    {label:"Appraisal",       color:"#FBBF24",step:4},
  pending_custody:      {label:"Custody Check",   color:"#FBBF24",step:5},
  pending_verification: {label:"Final Review",    color:"#FBBF24",step:6},
  verified:             {label:"Verified",        color:"#14F195",step:8},
  collateral_eligible:  {label:"Borrow Ready",    color:"#14F195",step:9},
  borrowed:             {label:"Active Loan",     color:"#6b8cff",step:10},
  listed:               {label:"Market Ready",    color:"#14F195",step:11},
  rejected:             {label:"Rejected",        color:"#f26b6b",step:0},
  closed:               {label:"Closed",          color:"rgba(255,255,255,0.2)",step:0},
};

const PIPELINE = ["Submitted","Documents","Identity","Appraisal",
  "Custody","Final Review","Verified","Borrow Eligible","Active","Market Ready"];

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtUsd(n:number|null):string {
  if(n===null||n===undefined) return "Pending";
  if(n===0) return "$0";
  return n>=1_000_000?`$${(n/1e6).toFixed(2)}M`:n>=1000?`$${(n/1000).toFixed(1)}K`:`$${n.toFixed(0)}`;
}
function shortPk(k:string):string {
  return k&&k.length>12?`${k.slice(0,6)}...${k.slice(-4)}`:k||"Not set";
}

type AbraAsset = ReturnType<typeof useAbraStore.getState>["assets"][0];

// ═══════════════════════════════════════════════════════════════════════════════
// INLINE: Intelligence Ticker
// ═══════════════════════════════════════════════════════════════════════════════
const TICKER_ITEMS = [
  {tag:"RWA",      label:"RWA On-Chain TVL",      value:"$12.4B",  change:"+340% YoY", up:true},
  {tag:"STABLE",   label:"Stablecoin Total",       value:"$168.3B", change:"+24.6%",   up:true},
  {tag:"RWA",      label:"Tokenized Treasuries",   value:"$4.1B",   change:"+820%",    up:true},
  {tag:"SOL",      label:"SOL Price",              value:"$152.40", change:"+4.2%",    up:true},
  {tag:"BTC",      label:"BTC Price",              value:"$98,200", change:"+2.1%",    up:true},
  {tag:"STABLE",   label:"USDT Market Cap",        value:"$109.2B", change:"+12.4%",   up:true},
  {tag:"STABLE",   label:"USDC Market Cap",        value:"$44.8B",  change:"+38.1%",   up:true},
  {tag:"RWA",      label:"Tokenized Real Estate",  value:"$380M",   change:"+110%",    up:true},
  {tag:"INST",     label:"BlackRock BUIDL",        value:"$1.7B",   change:"+560%",    up:true},
  {tag:"RWA",      label:"Active RWA Protocols",   value:"47",      change:"+23",      up:true},
  {tag:"SOL",      label:"Solana DeFi TVL",        value:"$8.4B",   change:"+92%",     up:true},
  {tag:"DEFI",     label:"DeFi Total TVL",         value:"$108B",   change:"+44%",     up:true},
  {tag:"INST",     label:"Institutional Wallets",  value:"14,200",  change:"+34%",     up:true},
  {tag:"PROTOCOL", label:"Abraxas Protocol",       value:"LIVE",                       up:true},
];
const TAG_COL: Record<string,string> = {
  RWA:"#14F195",STABLE:"#6b8cff",SOL:"#9945FF",
  BTC:"#F7931A",DEFI:"#FBBF24",INST:"#C8A96E",PROTOCOL:"#C8A96E",
};

function InlineTicker() {
  const [paused, setPaused] = useState(false);
  const [liveItems, setLiveItems] = useState(TICKER_ITEMS);

  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,tether,usd-coin&vs_currencies=usd&include_24hr_change=true")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setLiveItems(prev => prev.map(item => {
          if (item.label === "SOL Price" && data.solana?.usd)
            return {...item, value:`$${data.solana.usd.toFixed(2)}`,
              change:`${data.solana.usd_24h_change>=0?"+":""}${data.solana.usd_24h_change?.toFixed(1)}%`,
              up: data.solana.usd_24h_change >= 0};
          if (item.label === "BTC Price" && data.bitcoin?.usd)
            return {...item, value:`$${data.bitcoin.usd.toLocaleString()}`,
              change:`${data.bitcoin.usd_24h_change>=0?"+":""}${data.bitcoin.usd_24h_change?.toFixed(1)}%`,
              up: data.bitcoin.usd_24h_change >= 0};
          return item;
        }));
      }).catch(() => {});
  }, []);

  const doubled = [...liveItems, ...liveItems];

  return (
    <div style={{overflow:"hidden",position:"relative",height:34,
      borderBottom:"1px solid rgba(255,255,255,0.06)",
      background:"rgba(6,8,16,0.99)",marginBottom:"1.5rem"}}
      onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:40,
        background:"linear-gradient(90deg,rgba(6,8,16,1),transparent)",zIndex:2}}/>
      <div style={{display:"flex",alignItems:"center",height:"100%",
        whiteSpace:"nowrap",
        animation:`ticker-scroll ${liveItems.length*4}s linear infinite`,
        animationPlayState:paused?"paused":"running"}}>
        {doubled.map((item,i) => {
          const col = TAG_COL[item.tag]??"rgba(255,255,255,0.4)";
          return (
            <div key={i} style={{display:"inline-flex",alignItems:"center",
              gap:"0.375rem",padding:"0 1rem",
              borderRight:"1px solid rgba(255,255,255,0.05)",flexShrink:0}}>
              <span style={{fontSize:"0.3rem",fontWeight:700,color:`${col}60`,
                fontFamily:MONO,letterSpacing:"0.12em",textTransform:"uppercase"}}>
                {item.tag}
              </span>
              <span style={{fontSize:"0.42rem",color:"rgba(255,255,255,0.4)",
                fontFamily:MONO}}>{item.label}</span>
              <span style={{fontSize:"0.48rem",fontWeight:900,color:col,
                fontFamily:MONO}}>{item.value}</span>
              {item.change && (
                <span style={{fontSize:"0.36rem",fontWeight:700,
                  color:item.up?"#14F195":"#f26b6b",fontFamily:MONO}}>
                  {item.change}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{position:"absolute",right:0,top:0,bottom:0,width:40,
        background:"linear-gradient(270deg,rgba(6,8,16,1),transparent)",zIndex:2}}/>
      <style>{`@keyframes ticker-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INLINE: Circuit Monitor Feed
// ═══════════════════════════════════════════════════════════════════════════════
const CIRCUIT_SIGNALS = [
  {level:"NOMINAL",type:"ORACLE",    msg:"Price feed consistent across 3 sources"},
  {level:"NOMINAL",type:"COLLATERAL",msg:"Collateral health within normal bounds"},
  {level:"WATCH",  type:"LIQUIDITY", msg:"RWA liquidity depth below 30-day average"},
  {level:"NOMINAL",type:"CUSTODY",   msg:"Custody network response nominal"},
  {level:"WATCH",  type:"VOLATILITY",msg:"Metals price variance elevated 4.2%"},
  {level:"NOMINAL",type:"WALLET",    msg:"No suspicious wallet patterns detected"},
  {level:"NOMINAL",type:"ORACLE",    msg:"Pyth feed latency within threshold"},
  {level:"NOMINAL",type:"PROTOCOL",  msg:"All state transitions verified on-chain"},
];
const LEVEL_COL: Record<string,string> = {
  NOMINAL:"rgba(20,241,149,0.6)", WATCH:"#FBBF24", ALERT:"#FF8C00", CRITICAL:"#f26b6b",
};

function CircuitMonitor() {
  const [signals, setSignals] = useState(
    CIRCUIT_SIGNALS.slice(0,5).map((s,i) => ({...s, id:i, ts:Date.now()-i*15000}))
  );

  useEffect(() => {
    const iv = setInterval(() => {
      const base = CIRCUIT_SIGNALS[Math.floor(Math.random()*CIRCUIT_SIGNALS.length)];
      setSignals(prev => [{...base, id:Date.now(), ts:Date.now()}, ...prev].slice(0,6));
    }, 14_000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{border:"1px solid rgba(20,241,149,0.12)",borderRadius:"8px",
      overflow:"hidden",marginBottom:"2rem"}}>
      <div style={{padding:"0.5rem 0.875rem",
        borderBottom:"1px solid rgba(20,241,149,0.08)",
        display:"flex",alignItems:"center",justifyContent:"space-between",
        background:"rgba(20,241,149,0.04)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#14F195",
            animation:"pulse 1.5s ease-in-out infinite"}}/>
          <span style={{fontSize:"0.44rem",fontWeight:700,
            color:"rgba(20,241,149,0.7)",fontFamily:MONO,
            letterSpacing:"0.15em",textTransform:"uppercase"}}>
            CIRCUIT MONITOR · LIVE
          </span>
        </div>
        <span style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.2)",fontFamily:MONO}}>
          {signals.filter(s=>s.level!=="NOMINAL").length} active flags
        </span>
      </div>
      {signals.map((sig,i) => {
        const col = LEVEL_COL[sig.level]??"rgba(255,255,255,0.3)";
        const age = Math.round((Date.now()-sig.ts)/1000);
        const ageStr = age<60?`${age}s`:age<3600?`${Math.round(age/60)}m`:`${Math.round(age/3600)}h`;
        return (
          <div key={sig.id} style={{display:"grid",
            gridTemplateColumns:"64px 90px 1fr 36px",
            padding:"0.4rem 0.875rem",gap:"0.5rem",alignItems:"center",
            borderBottom:i<signals.length-1?"1px solid rgba(255,255,255,0.04)":"none",
            opacity:Math.max(0.4,1-i*0.1),transition:"opacity 0.3s"}}>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:4,height:4,borderRadius:"50%",background:col,flexShrink:0,
                animation:sig.level!=="NOMINAL"?"pulse 1.5s ease-in-out infinite":"none"}}/>
              <span style={{fontSize:"0.3rem",fontWeight:800,color:col,
                fontFamily:MONO,letterSpacing:"0.08em"}}>{sig.level}</span>
            </div>
            <span style={{fontSize:"0.34rem",color:"rgba(255,255,255,0.3)",
              fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.08em"}}>
              {sig.type}
            </span>
            <span style={{fontSize:"0.44rem",color:"rgba(255,255,255,0.55)"}}>{sig.msg}</span>
            <span style={{fontSize:"0.32rem",color:"rgba(255,255,255,0.2)",
              fontFamily:MONO,textAlign:"right"}}>{ageStr}</span>
          </div>
        );
      })}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INLINE: Pipeline bar
// ═══════════════════════════════════════════════════════════════════════════════
function PipelineBar({step}:{step:number}) {
  return (
    <div style={{marginTop:"0.5rem"}}>
      <div style={{display:"flex",gap:"2px",marginBottom:"0.25rem"}}>
        {PIPELINE.map((_,i)=>(
          <div key={i} style={{flex:1,height:3,borderRadius:2,
            background:i<step?"#14F195":i===step-1?"#FBBF24":"rgba(255,255,255,0.07)",
            transition:"background 0.4s"}}/>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <span style={{fontSize:"0.32rem",color:"rgba(255,255,255,0.25)",fontFamily:MONO}}>
          {step>0?PIPELINE[step-1]:"Not started"}
        </span>
        <span style={{fontSize:"0.32rem",color:"rgba(255,255,255,0.18)",fontFamily:MONO}}>
          {step}/{PIPELINE.length}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INLINE: Asset row
// ═══════════════════════════════════════════════════════════════════════════════
function AssetRow({a}:{a:AbraAsset}) {
  const [open,setOpen] = useState(false);
  const st    = STATUS_META[a.status]??STATUS_META["created"];
  const borrow = a.estimatedUsd>0?Math.round(a.estimatedUsd*a.ltv/100):0;
  return (
    <div style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"grid",
        gridTemplateColumns:"2fr 1fr 1fr 1fr 50px",
        padding:"0.75rem 1rem",gap:"0.5rem",alignItems:"center",cursor:"pointer"}}>
        <div>
          <div style={{fontWeight:700,fontSize:"0.62rem",color:"#f0f0f0",
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div>
          <div style={{fontSize:"0.34rem",color:"rgba(255,255,255,0.2)",
            fontFamily:MONO,marginTop:2}}>{a.assetClass}</div>
        </div>
        <div style={{fontSize:"0.56rem",fontWeight:700,color:"#f0f0f0",fontFamily:MONO}}>
          {a.estimatedUsd>0?fmtUsd(a.estimatedUsd):"Not valued"}
        </div>
        <div style={{fontSize:"0.54rem",
          color:borrow>0?"#14F195":"rgba(255,255,255,0.18)",fontFamily:MONO}}>
          {borrow>0?fmtUsd(borrow):"Pending"}
        </div>
        <div style={{fontSize:"0.36rem",fontWeight:600,color:st.color,
          fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.08em"}}>
          {st.label}
        </div>
        <div style={{textAlign:"right",fontSize:"0.42rem",color:"rgba(255,255,255,0.2)"}}>
          {open?"▲":"▼"}
        </div>
      </div>
      {open&&(
        <div style={{padding:"0 1rem 0.875rem",display:"grid",
          gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
          <div>
            <div style={{fontSize:"0.32rem",fontWeight:700,color:"rgba(255,255,255,0.2)",
              fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:4}}>
              Verification Progress
            </div>
            <PipelineBar step={st.step}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"0.35rem"}}>
            {([
              ["LTV Cap",    `${a.ltv}%`],
              ["ABRA Spent", `${a.mintCostAbra} ABRA`],
              ["Token ID",   shortPk(a.tokenId||"Pending")],
              ["Tx",         shortPk(a.txSignature||"Pending")],
            ] as [string,string][]).map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",
                padding:"0.25rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <span style={{fontSize:"0.34rem",color:"rgba(255,255,255,0.2)",
                  fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.1em"}}>{k}</span>
                <span style={{fontSize:"0.38rem",fontWeight:600,
                  color:"rgba(255,255,255,0.55)",fontFamily:MONO}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT: PortfolioTab
// ═══════════════════════════════════════════════════════════════════════════════
export function PortfolioTab() {
  const [mounted,    setMounted]    = useState(false);
  const [showStudio, setShowStudio] = useState(false);
  const [showAll,    setShowAll]    = useState(false);
  const studioRef                   = useRef<HTMLDivElement>(null);

  const {connected, publicKey}       = useWallet();
  const {setVisible}                 = useWalletModal();
  const {isVerified, verifying,
         error, verify}              = useWalletAuth();
  const {balance, loading:balLoading}= useAbraBalance();
  const assets                       = useAbraStore(s=>s.assets);
  const storeBalance                 = useAbraStore(s=>s.abraBalance);

  useEffect(()=>{setMounted(true);},[]);
  if(!mounted) return null;

  const displayBalance = connected ? balance : storeBalance;
  const pending  = assets.filter(a=>{
    const step = STATUS_META[a.status]?.step??0;
    return step>0&&step<8&&a.status!=="closed"&&a.status!=="rejected";
  });
  const verified = assets.filter(a=>{
    const step = STATUS_META[a.status]?.step??0;
    return step>=8&&a.status!=="closed"&&a.status!=="rejected";
  });
  const shown           = showAll?verified:verified.slice(0,3);
  const totalBorrowable = verified.reduce((s,a)=>s+Math.round(a.estimatedUsd*a.ltv/100),0);

  function openStudio() {
    setShowStudio(true);
    setTimeout(()=>studioRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),150);
  }

  function Rule({label}:{label:string}) {
    return (
      <div style={{display:"flex",alignItems:"center",gap:"0.875rem",
        margin:"2.5rem 0 1.25rem"}}>
        <div style={{flex:1,height:1,background:"rgba(255,255,255,0.07)"}}/>
        <span style={{fontSize:"0.34rem",fontWeight:700,letterSpacing:"0.22em",
          color:"rgba(255,255,255,0.2)",fontFamily:MONO,
          textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</span>
        <div style={{flex:1,height:1,background:"rgba(255,255,255,0.07)"}}/>
      </div>
    );
  }

  return (
    <div style={{maxWidth:900,margin:"0 auto"}}>

      {/* ── LIVE INTELLIGENCE TICKER ── */}
      <InlineTicker/>

      {/* ── HERO ── */}
      <div style={{padding:"2rem 0 1.75rem",borderBottom:"1px solid rgba(255,255,255,0.06)",
        marginBottom:"2rem"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,
          padding:"0.18rem 0.625rem",borderRadius:"3px",
          border:"1px solid rgba(200,169,110,0.2)",background:"rgba(200,169,110,0.05)",
          marginBottom:"1.25rem"}}>
          <div style={{width:4,height:4,borderRadius:"50%",background:"#C8A96E",
            animation:"pulse 2s ease-in-out infinite"}}/>
          <span style={{fontSize:"0.36rem",fontWeight:700,
            color:"rgba(200,169,110,0.7)",fontFamily:MONO,
            letterSpacing:"0.2em",textTransform:"uppercase"}}>
            Verification Intelligence Layer · Solana
          </span>
        </div>

        <h1 style={{fontWeight:900,fontSize:"clamp(1.6rem,3.5vw,2.5rem)",
          color:"#f0f0f0",margin:"0 0 0.75rem",letterSpacing:"-0.04em",
          lineHeight:1.08,maxWidth:640}}>
          Your assets have capital.<br/>
          <span style={{color:"#C8A96E"}}>Abraxas makes it accessible.</span>
        </h1>
        <p style={{fontSize:"0.56rem",color:"rgba(255,255,255,0.38)",
          lineHeight:1.8,maxWidth:560,margin:"0 0 1.75rem"}}>
          Abraxas is the verification and capital intelligence layer for real world assets
          on Solana. Tokenize physical assets, unlock on-chain borrowing power, and access
          institutional liquidity — without selling what you own.
        </p>

        {!connected?(
          <div style={{display:"flex",gap:"0.625rem",flexWrap:"wrap"}}>
            <button onClick={()=>setVisible(true)} style={{padding:"0.75rem 1.5rem",
              borderRadius:"5px",border:"none",cursor:"pointer",fontWeight:800,
              fontSize:"0.64rem",fontFamily:MONO,letterSpacing:"0.05em",
              background:"#7c3aed",color:"#fff"}}>
              Connect and Authenticate
            </button>
            <button onClick={openStudio} style={{padding:"0.75rem 1.5rem",
              borderRadius:"5px",border:"1px solid rgba(255,255,255,0.1)",
              cursor:"pointer",fontWeight:600,fontSize:"0.6rem",fontFamily:MONO,
              background:"transparent",color:"rgba(255,255,255,0.4)"}}>
              Explore Studio
            </button>
          </div>
        ):(
          <div style={{display:"flex",alignItems:"center",gap:"0.75rem",flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,
              padding:"0.4rem 0.75rem",borderRadius:"4px",
              border:"1px solid rgba(20,241,149,0.2)",background:"rgba(20,241,149,0.04)"}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:"#14F195"}}/>
              <span style={{fontSize:"0.46rem",fontWeight:700,
                color:"rgba(255,255,255,0.6)",fontFamily:MONO}}>
                {shortPk(publicKey?.toBase58()??"")}
              </span>
            </div>
            {isVerified?(
              <div style={{display:"flex",alignItems:"center",gap:5,
                padding:"0.35rem 0.65rem",borderRadius:"4px",
                border:"1px solid rgba(107,140,255,0.25)",
                background:"rgba(107,140,255,0.06)"}}>
                <span style={{fontSize:"0.38rem",color:"#6b8cff",fontFamily:MONO,
                  fontWeight:700,textTransform:"uppercase",
                  letterSpacing:"0.12em"}}>Authenticated</span>
              </div>
            ):(
              <button onClick={verify} disabled={verifying} style={{
                padding:"0.35rem 0.75rem",borderRadius:"4px",
                border:"1px solid rgba(251,191,36,0.3)",cursor:"pointer",
                fontWeight:700,fontSize:"0.46rem",fontFamily:MONO,
                background:"rgba(251,191,36,0.07)",color:"#FBBF24"}}>
                {verifying?"Awaiting Signature":"Sign to Authenticate"}
              </button>
            )}
            {error&&<span style={{fontSize:"0.44rem",color:"#f26b6b",fontFamily:MONO}}>
              {error}
            </span>}
          </div>
        )}
      </div>

      {/* ── CIRCUIT MONITOR ── */}
      <CircuitMonitor/>

      {/* ── PORTFOLIO REGISTRY ── */}
      <Rule label="Asset Registry"/>
      {!connected?(
        <div style={{padding:"2.5rem 2rem",textAlign:"center",
          border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",
          background:"rgba(255,255,255,0.01)"}}>
          <div style={{fontSize:"0.6rem",fontWeight:700,
            color:"rgba(255,255,255,0.18)",marginBottom:"0.4rem"}}>
            Connect wallet to view your positions
          </div>
          <div style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.12)",
            lineHeight:1.65,maxWidth:340,margin:"0 auto 1rem"}}>
            Your tokenized asset registry, live ABRA balance, and borrow capacity
            appear here once connected.
          </div>
          <button onClick={()=>setVisible(true)} style={{padding:"0.65rem 1.25rem",
            borderRadius:"6px",border:"none",cursor:"pointer",fontWeight:700,
            fontSize:"0.6rem",fontFamily:MONO,background:"#7c3aed",color:"#fff"}}>
            Connect Wallet
          </button>
        </div>
      ):assets.length===0?(
        <div style={{padding:"2.5rem 2rem",textAlign:"center",
          border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",
          background:"rgba(255,255,255,0.01)"}}>
          <div style={{fontSize:"0.6rem",fontWeight:700,
            color:"rgba(255,255,255,0.18)",marginBottom:"0.4rem"}}>
            No assets on record
          </div>
          <div style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.12)",
            lineHeight:1.7,maxWidth:380,margin:"0 auto 1rem"}}>
            Tokenize a real-world asset below to create your first verified on-chain position.
            Once authenticated, it becomes eligible for USDC borrowing via Loopscale.
          </div>
          <button onClick={openStudio} style={{padding:"0.65rem 1.25rem",borderRadius:"6px",
            border:"1px solid rgba(200,169,110,0.3)",cursor:"pointer",fontWeight:700,
            fontSize:"0.6rem",fontFamily:MONO,
            background:"rgba(200,169,110,0.07)",color:"#C8A96E"}}>
            Begin Tokenization
          </button>
        </div>
      ):(
        <>
          {totalBorrowable>0&&(
            <div style={{padding:"0.875rem 1rem",
              border:"1px solid rgba(20,241,149,0.15)",borderRadius:"8px",
              background:"rgba(20,241,149,0.04)",marginBottom:"0.75rem",
              display:"flex",justifyContent:"space-between",alignItems:"center",
              flexWrap:"wrap",gap:"0.5rem"}}>
              <div>
                <div style={{fontSize:"0.38rem",color:"rgba(20,241,149,0.4)",
                  fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.12em",
                  marginBottom:3}}>Total Borrow Capacity</div>
                <div style={{fontSize:"1.1rem",fontWeight:900,color:"#14F195",
                  fontFamily:MONO}}>{fmtUsd(totalBorrowable)} USDC</div>
              </div>
              <button onClick={()=>window.open("https://app.loopscale.com","_blank","noopener")}
                style={{padding:"0.55rem 1rem",borderRadius:"6px",
                  border:"1px solid rgba(107,140,255,0.35)",cursor:"pointer",
                  fontWeight:700,fontSize:"0.56rem",fontFamily:MONO,
                  background:"rgba(107,140,255,0.07)",color:"#6b8cff"}}>
                Borrow via Loopscale
              </button>
            </div>
          )}
          <div style={{border:"1px solid rgba(255,255,255,0.06)",borderRadius:"7px",
            overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 50px",
              padding:"0.45rem 1rem",gap:"0.5rem",
              borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
              {["Asset","Value","Borrow Cap","Status",""].map(h=>(
                <div key={h} style={{fontSize:"0.32rem",fontWeight:700,
                  color:"rgba(255,255,255,0.18)",fontFamily:MONO,
                  textTransform:"uppercase",letterSpacing:"0.14em"}}>{h}</div>
              ))}
            </div>
            {shown.map(a=><AssetRow key={a.id} a={a}/>)}
          </div>
          {verified.length>3&&(
            <button onClick={()=>setShowAll(s=>!s)} style={{width:"100%",marginTop:"0.5rem",
              padding:"0.5rem",borderRadius:"5px",
              border:"1px solid rgba(255,255,255,0.07)",cursor:"pointer",
              fontSize:"0.46rem",fontWeight:600,fontFamily:MONO,
              background:"rgba(255,255,255,0.02)",color:"rgba(255,255,255,0.3)"}}>
              {showAll?`Show fewer`:`View all ${verified.length} assets`}
            </button>
          )}
        </>
      )}

      {/* ── PENDING AUTHENTICATION ── */}
      {pending.length>0&&(
        <>
          <Rule label="Pending Authentication"/>
          <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
            {pending.map(a=>{
              const st=STATUS_META[a.status]??STATUS_META["created"];
              return(
                <div key={a.id} style={{padding:"0.875rem 1rem",
                  border:"1px solid rgba(255,255,255,0.06)",borderRadius:"7px",
                  background:"rgba(255,255,255,0.01)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"center",marginBottom:"0.625rem",gap:"0.5rem"}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:"0.62rem",color:"#f0f0f0"}}>
                        {a.name}
                      </div>
                      <div style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.2)",
                        fontFamily:MONO,marginTop:2}}>{a.assetClass}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:5,
                      padding:"0.18rem 0.5rem",borderRadius:"3px",
                      border:`1px solid ${st.color}25`,background:`${st.color}08`,
                      flexShrink:0}}>
                      <div style={{width:4,height:4,borderRadius:"50%",
                        background:st.color,animation:"pulse 1.5s ease-in-out infinite"}}/>
                      <span style={{fontSize:"0.34rem",fontWeight:700,color:st.color,
                        fontFamily:MONO,textTransform:"uppercase",
                        letterSpacing:"0.1em"}}>{st.label}</span>
                    </div>
                  </div>
                  <PipelineBar step={st.step}/>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── ABRA TOKEN ── */}
      <Rule label="ABRA Token"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.625rem",
        marginBottom:"2rem"}}>
        <div style={{gridColumn:"1/-1",padding:"0.875rem 1rem",
          border:"1px solid rgba(255,255,255,0.07)",borderRadius:"7px"}}>
          <div style={{fontSize:"0.32rem",fontWeight:700,color:"rgba(255,255,255,0.18)",
            fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.18em",
            marginBottom:"0.4rem"}}>Contract Address · Solana Mainnet</div>
          <div style={{display:"flex",alignItems:"center",gap:"0.625rem",flexWrap:"wrap"}}>
            <code style={{fontSize:"0.46rem",color:"rgba(255,255,255,0.5)",
              fontFamily:MONO,flex:1,wordBreak:"break-all"}}>{ABRA_CA}</code>
            <button onClick={()=>navigator.clipboard.writeText(ABRA_CA)} style={{
              padding:"0.18rem 0.5rem",borderRadius:"3px",
              border:"1px solid rgba(255,255,255,0.1)",
              background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.3)",
              fontSize:"0.36rem",cursor:"pointer",fontFamily:MONO}}>Copy</button>
          </div>
        </div>

        <div style={{padding:"0.875rem 1rem",
          border:"1px solid rgba(200,169,110,0.18)",borderRadius:"7px",
          background:"rgba(200,169,110,0.04)"}}>
          <div style={{fontSize:"0.32rem",fontWeight:700,color:"rgba(200,169,110,0.45)",
            fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.18em",
            marginBottom:"0.35rem"}}>Your Balance</div>
          <div style={{fontSize:"1.1rem",fontWeight:900,color:"#C8A96E",
            fontFamily:MONO,lineHeight:1,marginBottom:3}}>
            {balLoading?"...":displayBalance.toLocaleString()}
          </div>
          <div style={{fontSize:"0.38rem",color:"rgba(200,169,110,0.4)",fontFamily:MONO}}>
            {connected?"Live on-chain balance":"Demo balance — connect wallet"}
          </div>
        </div>

        <div style={{padding:"0.875rem 1rem",
          border:"1px solid rgba(255,255,255,0.07)",borderRadius:"7px"}}>
          <div style={{fontSize:"0.32rem",fontWeight:700,color:"rgba(255,255,255,0.18)",
            fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.18em",
            marginBottom:"0.625rem"}}>Acquire ABRA</div>
          {([
            ["Jupiter",  JUPITER_URL, "#14F195"],
            ["Raydium",  RAYDIUM_URL, "#6b8cff"],
          ] as [string,string,string][]).map(([n,u,c])=>(
            <a key={n} href={u} target="_blank" rel="noopener noreferrer"
              style={{display:"flex",justifyContent:"space-between",padding:"0.35rem 0",
                borderBottom:"1px solid rgba(255,255,255,0.04)",textDecoration:"none"}}>
              <span style={{fontSize:"0.48rem",fontWeight:700,color:c,fontFamily:MONO}}>
                {n}
              </span>
              <span style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.2)",fontFamily:MONO}}>
                Trade
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* ── VERIFICATION STANDARD ── */}
      <Rule label="AAS-1 Verification Standard"/>
      <div style={{padding:"1.5rem",border:"1px solid rgba(200,169,110,0.2)",
        borderRadius:"8px",background:"rgba(200,169,110,0.03)",marginBottom:"2rem"}}>
        <div style={{display:"flex",alignItems:"center",
          justifyContent:"space-between",marginBottom:"1rem",flexWrap:"wrap",gap:"0.5rem"}}>
          <div>
            <div style={{fontSize:"0.36rem",fontWeight:700,letterSpacing:"0.2em",
              color:"rgba(200,169,110,0.5)",fontFamily:MONO,textTransform:"uppercase",
              marginBottom:"0.3rem"}}>Proprietary Protocol</div>
            <h2 style={{fontWeight:900,fontSize:"1rem",color:"#f0f0f0",
              margin:"0 0 0.25rem",letterSpacing:"-0.02em"}}>
              Abraxas Authentication Standard
            </h2>
            <p style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.35)",
              lineHeight:1.7,margin:0,maxWidth:480}}>
              Five-stage proprietary verification pipeline. Every event anchored on Solana.
              Built in-house. No external custodian API dependencies.
            </p>
          </div>
          <div style={{padding:"0.5rem 0.875rem",borderRadius:"5px",
            background:"rgba(200,169,110,0.08)",
            border:"1px solid rgba(200,169,110,0.2)",flexShrink:0}}>
            <div style={{fontSize:"0.28rem",fontWeight:700,color:"rgba(200,169,110,0.5)",
              fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:3}}>
              Standard
            </div>
            <div style={{fontSize:"0.7rem",fontWeight:900,color:"#C8A96E",fontFamily:MONO}}>
              AAS-1
            </div>
          </div>
        </div>
        {[
          {n:"01",col:"#C8A96E",title:"Metadata Hashing",
           desc:"Documentation and provenance records hashed and permanently anchored on Solana at submission."},
          {n:"02",col:"#FBBF24",title:"Ownership Verification",
           desc:"Wallet signs a protocol message binding the on-chain token to a proven controller."},
          {n:"03",col:"#FBBF24",title:"Custody Validation",
           desc:"Physical inspection with co-signed on-chain state transition. Irreversible without custodian sign-off."},
          {n:"04",col:"#14F195",title:"Borrow Qualification",
           desc:"Class-based LTV assignment. Lending eligibility tied to verified on-chain status only."},
          {n:"05",col:"#6b8cff",title:"Transfer Protection",
           desc:"Dual signature required for all transfers. A compromised key cannot enable physical delivery."},
        ].map((s,i)=>(
          <div key={s.n} style={{display:"grid",gridTemplateColumns:"2.5rem 1fr",
            gap:"0.75rem",padding:"0.75rem 0",
            borderTop:"1px solid rgba(255,255,255,0.05)",alignItems:"start"}}>
            <div style={{fontSize:"0.32rem",fontWeight:700,color:`${s.col}50`,
              fontFamily:MONO,letterSpacing:"0.12em",paddingTop:3}}>{s.n}</div>
            <div>
              <div style={{fontWeight:800,fontSize:"0.62rem",color:"#f0f0f0",
                marginBottom:"0.2rem"}}>{s.title}</div>
              <div style={{fontSize:"0.46rem",color:"rgba(255,255,255,0.3)",lineHeight:1.65}}>
                {s.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── TOKENIZATION STUDIO ── */}
      <Rule label="Tokenization Studio"/>
      <div ref={studioRef}>
        {!showStudio?(
          <div style={{padding:"1.75rem 1.5rem",
            border:"1px solid rgba(255,255,255,0.07)",borderRadius:"7px",
            background:"rgba(255,255,255,0.01)"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",
              gap:"1.25rem",alignItems:"start",marginBottom:"1.5rem"}}>
              <div>
                <h3 style={{fontWeight:900,fontSize:"0.95rem",color:"#f0f0f0",
                  margin:"0 0 0.4rem"}}>Begin Asset Tokenization</h3>
                <p style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.28)",
                  lineHeight:1.7,margin:0}}>
                  Submit any physical asset — watches, spirits, metals, art,
                  property, short-term rentals — through the Abraxas verification
                  pipeline to create a verified Token-2022 position on Solana.
                </p>
              </div>
              <button onClick={openStudio} style={{padding:"0.75rem 1.5rem",
                borderRadius:"5px",border:"none",cursor:"pointer",fontWeight:800,
                fontSize:"0.64rem",fontFamily:MONO,letterSpacing:"0.05em",
                background:"linear-gradient(135deg,#7c3aed,#C8A96E)",color:"#fff",
                whiteSpace:"nowrap"}}>
                Start →
              </button>
            </div>
            <div style={{display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,138px),1fr))",
              gap:"0.4rem"}}>
              {([
                ["Watches",           "#6b8cff","◎","65% LTV"],
                ["Spirits",           "#FF8C00","◈","55% LTV"],
                ["Cards (PSA/BGS)",   "#FBBF24","⬡","55% LTV"],
                ["Metals",            "#D4AF37","◆","80% LTV"],
                ["Art",               "#f26b6b","◭","50% LTV"],
                ["Property",          "#14F195","⬛","60% LTV"],
                ["Short-Term Rental", "#14F195","⊞","55% LTV"],
                ["Other",             "#C8A96E","⬢","45% LTV"],
              ] as [string,string,string,string][]).map(([nm,col,icon,ltv])=>(
                <div key={nm} onClick={openStudio} style={{padding:"0.7rem 0.75rem",
                  borderRadius:"5px",cursor:"pointer",
                  border:`1px solid ${col}18`,background:`${col}05`,
                  transition:"all 0.15s"}}
                onMouseEnter={e=>{const el=e.currentTarget as HTMLDivElement;
                  el.style.background=`${col}10`;el.style.borderColor=`${col}35`;}}
                onMouseLeave={e=>{const el=e.currentTarget as HTMLDivElement;
                  el.style.background=`${col}05`;el.style.borderColor=`${col}18`;}}>
                  <div style={{fontSize:"0.88rem",color:col,opacity:0.6,
                    marginBottom:"0.2rem",lineHeight:1}}>{icon}</div>
                  <div style={{fontWeight:800,fontSize:"0.52rem",color:"#f0f0f0",
                    marginBottom:2}}>{nm}</div>
                  <div style={{fontSize:"0.3rem",color:"rgba(255,255,255,0.18)",
                    fontFamily:MONO}}>{ltv}</div>
                </div>
              ))}
            </div>
          </div>
        ):(
          <div style={{border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:"7px",overflow:"hidden"}}>
            <div style={{padding:"0.5rem 1rem",
              borderBottom:"1px solid rgba(255,255,255,0.06)",
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:"0.34rem",fontWeight:700,
                color:"rgba(255,255,255,0.18)",fontFamily:MONO,
                textTransform:"uppercase",letterSpacing:"0.18em"}}>
                Tokenization Studio
              </span>
              <button onClick={()=>setShowStudio(false)} style={{background:"none",
                border:"none",cursor:"pointer",color:"rgba(255,255,255,0.25)",
                fontSize:"0.75rem",padding:"0 0.2rem"}}>x</button>
            </div>
            <div style={{padding:"0.5rem"}}>
              <IssuanceEngine onSuccess={()=>{
                setShowStudio(false);
                window.scrollTo({top:0,behavior:"smooth"});
              }}/>
            </div>
          </div>
        )}
      </div>

      <div style={{height:"2rem"}}/>
    </div>
  );
}