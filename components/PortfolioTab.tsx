"use client";
// FILE: components/PortfolioTab.tsx
// ZERO static data. ZERO inventory imports. ZERO seed assets.
// Reads ONLY from Zustand store. Empty state when no real assets exist.
// No partner name-drops. No bags.fm (replaced with Jupiter).
// Institutional — Bloomberg x Hyperliquid.
"use client";

import { useState, useEffect, useRef }    from "react";
import { useWallet }                       from "@solana/wallet-adapter-react";
import { useWalletModal }                  from "@solana/wallet-adapter-react-ui";
import { useAbraStore }                    from "@/lib/abraxasStore";
import { useWalletAuth }                   from "@/lib/hooks/useWalletAuth";
import { useAbraBalance, ABRA_MIN_FEE }   from "@/lib/hooks/useAbraBalance";
import { IssuanceEngine }                  from "@/components/IssuanceEngine";

const ABRA_CA     = "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS";
const SWAP_URL    = `https://jup.ag/swap/SOL-${ABRA_CA}`;
const RAYDIUM_URL = `https://raydium.io/swap/?inputCurrency=sol&outputCurrency=${ABRA_CA}`;

type AbraAsset = ReturnType<typeof useAbraStore.getState>["assets"][0];

const STATUS_META: Record<string,{label:string;color:string;step:number}> = {
  created:              {label:"Submitted",        color:"#C8A96E",step:1},
  pending_documents:    {label:"Documents Pending",color:"#FBBF24",step:2},
  pending_identity:     {label:"Identity Review",  color:"#FBBF24",step:3},
  pending_appraisal:    {label:"Appraisal",        color:"#FBBF24",step:4},
  pending_custody:      {label:"Custody Check",    color:"#FBBF24",step:5},
  pending_verification: {label:"Final Review",     color:"#FBBF24",step:6},
  verified:             {label:"Verified",         color:"#14F195",step:8},
  collateral_eligible:  {label:"Borrow Eligible",  color:"#14F195",step:9},
  borrowed:             {label:"Active Loan",       color:"#6b8cff",step:10},
  listed:               {label:"Market Ready",     color:"#14F195",step:11},
  rejected:             {label:"Rejected",         color:"#f26b6b",step:0},
  closed:               {label:"Closed",           color:"rgba(255,255,255,0.2)",step:0},
};

const PIPELINE = [
  "Submitted","Documents","Identity",
  "Appraisal","Custody","Final Review",
  "Verified","Borrow Eligible","Active","Market Ready",
];

function fmtUsd(n:number|null):string {
  if(n===null||n===undefined) return "Pending Sync";
  if(n===0) return "$0";
  return n>=1_000_000?`$${(n/1e6).toFixed(2)}M`:n>=1000?`$${(n/1000).toFixed(1)}K`:`$${n.toFixed(0)}`;
}
function shortPk(k:string):string {
  return k&&k.length>12?`${k.slice(0,6)}...${k.slice(-4)}`:k||"Not set";
}

function Rule({label}:{label:string}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:"0.875rem",margin:"2.5rem 0 1.25rem"}}>
      <div style={{flex:1,height:1,background:"rgba(255,255,255,0.07)"}}/>
      <span style={{fontSize:"0.34rem",fontWeight:700,letterSpacing:"0.22em",
        color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",
        textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</span>
      <div style={{flex:1,height:1,background:"rgba(255,255,255,0.07)"}}/>
    </div>
  );
}

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
        <span style={{fontSize:"0.32rem",color:"rgba(255,255,255,0.25)",
          fontFamily:"'JetBrains Mono',monospace"}}>
          {step>0?PIPELINE[step-1]:"Not started"}
        </span>
        <span style={{fontSize:"0.32rem",color:"rgba(255,255,255,0.18)",
          fontFamily:"'JetBrains Mono',monospace"}}>{step}/{PIPELINE.length}</span>
      </div>
    </div>
  );
}

function AssetRow({a}:{a:AbraAsset}) {
  const [open,setOpen]=useState(false);
  const st=STATUS_META[a.status]??STATUS_META["created"];
  const borrow=a.estimatedUsd>0?Math.round(a.estimatedUsd*a.ltv/100):0;
  return (
    <div style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"grid",
        gridTemplateColumns:"2fr 1fr 1fr 1fr 60px",
        padding:"0.75rem 1rem",gap:"0.5rem",alignItems:"center",cursor:"pointer"}}>
        <div>
          <div style={{fontWeight:700,fontSize:"0.62rem",color:"#f0f0f0",
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div>
          <div style={{fontSize:"0.34rem",color:"rgba(255,255,255,0.2)",
            fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>{a.assetClass}</div>
        </div>
        <div style={{fontSize:"0.56rem",fontWeight:700,color:"#f0f0f0",
          fontFamily:"'JetBrains Mono',monospace"}}>
          {a.estimatedUsd>0?fmtUsd(a.estimatedUsd):"Not valued"}
        </div>
        <div style={{fontSize:"0.54rem",
          color:borrow>0?"#14F195":"rgba(255,255,255,0.18)",
          fontFamily:"'JetBrains Mono',monospace"}}>
          {borrow>0?fmtUsd(borrow):"Pending"}
        </div>
        <div style={{fontSize:"0.36rem",fontWeight:600,color:st.color,
          fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
          letterSpacing:"0.08em"}}>{st.label}</div>
        <div style={{textAlign:"right",fontSize:"0.42rem",
          color:"rgba(255,255,255,0.2)"}}>{open?"▲":"▼"}</div>
      </div>
      {open&&(
        <div style={{padding:"0 1rem 0.875rem",display:"grid",
          gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
          <div>
            <div style={{fontSize:"0.32rem",fontWeight:700,
              color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",
              textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:4}}>
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
                  fontFamily:"'JetBrains Mono',monospace",
                  textTransform:"uppercase",letterSpacing:"0.1em"}}>{k}</span>
                <span style={{fontSize:"0.38rem",fontWeight:600,
                  color:"rgba(255,255,255,0.55)",
                  fontFamily:"'JetBrains Mono',monospace"}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function PortfolioTab() {
  const [mounted,      setMounted]      = useState(false);
  const [showStudio,   setShowStudio]   = useState(false);
  const [showAll,      setShowAll]      = useState(false);
  const studioRef                       = useRef<HTMLDivElement>(null);
  const {connected, publicKey}          = useWallet();
  const {setVisible}                    = useWalletModal();
  const {isVerified, verifying,
         error, verify}                 = useWalletAuth();
  const {balance, loading:balLoading}   = useAbraBalance();
  const assets                          = useAbraStore(s=>s.assets);
  const storeBalance                    = useAbraStore(s=>s.abraBalance);

  useEffect(()=>{setMounted(true);},[]);
  if(!mounted) return null;

  const displayBalance = connected ? balance : storeBalance;
  const pending   = assets.filter(a=>{
    const step=STATUS_META[a.status]?.step??0;
    return step>0&&step<8&&a.status!=="closed"&&a.status!=="rejected";
  });
  const verified  = assets.filter(a=>{
    const step=STATUS_META[a.status]?.step??0;
    return step>=8&&a.status!=="closed"&&a.status!=="rejected";
  });
  const shown     = showAll?verified:verified.slice(0,3);
  const totalBorrowable = verified.reduce(
    (s,a)=>s+Math.round(a.estimatedUsd*a.ltv/100),0
  );

  function openStudio(){
    setShowStudio(true);
    setTimeout(()=>studioRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),150);
  }

  return (
    <div style={{maxWidth:900,margin:"0 auto"}}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>

      {/* HERO */}
      <div style={{padding:"2.5rem 0 2rem",borderBottom:"1px solid rgba(255,255,255,0.06)",
        marginBottom:"2rem"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,
          padding:"0.18rem 0.625rem",borderRadius:"3px",
          border:"1px solid rgba(200,169,110,0.2)",
          background:"rgba(200,169,110,0.05)",marginBottom:"1.25rem"}}>
          <div style={{width:4,height:4,borderRadius:"50%",background:"#C8A96E",
            animation:"pulse 2s ease-in-out infinite"}}/>
          <span style={{fontSize:"0.34rem",fontWeight:700,
            color:"rgba(200,169,110,0.7)",fontFamily:"'JetBrains Mono',monospace",
            letterSpacing:"0.2em",textTransform:"uppercase"}}>
            Verification Intelligence Layer on Solana
          </span>
        </div>
        <h1 style={{fontWeight:900,fontSize:"clamp(1.6rem,3.5vw,2.5rem)",
          color:"#f0f0f0",margin:"0 0 0.75rem",letterSpacing:"-0.04em",
          lineHeight:1.08,maxWidth:640}}>
          Your assets have capital.<br/>
          <span style={{color:"#C8A96E"}}>Abraxas makes it accessible.</span>
        </h1>
        <p style={{fontSize:"0.54rem",color:"rgba(255,255,255,0.38)",
          lineHeight:1.8,maxWidth:540,margin:"0 0 1.75rem"}}>
          Abraxas is the verification and capital intelligence layer for real world assets
          on Solana. What eBay did for peer-to-peer commerce in Web2, Abraxas is building
          for asset-backed capital in Web3.
        </p>
        {!connected?(
          <div style={{display:"flex",gap:"0.625rem",flexWrap:"wrap"}}>
            <button onClick={()=>setVisible(true)} style={{padding:"0.7rem 1.4rem",
              borderRadius:"5px",border:"none",cursor:"pointer",fontWeight:800,
              fontSize:"0.6rem",fontFamily:"'JetBrains Mono',monospace",
              letterSpacing:"0.05em",background:"#7c3aed",color:"#fff"}}>
              Connect and Authenticate
            </button>
            <button onClick={openStudio} style={{padding:"0.7rem 1.4rem",borderRadius:"5px",
              border:"1px solid rgba(255,255,255,0.1)",cursor:"pointer",fontWeight:600,
              fontSize:"0.58rem",fontFamily:"'JetBrains Mono',monospace",
              background:"transparent",color:"rgba(255,255,255,0.4)"}}>
              Explore Studio
            </button>
          </div>
        ):(
          <div style={{display:"flex",alignItems:"center",gap:"0.75rem",flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,
              padding:"0.4rem 0.75rem",borderRadius:"4px",
              border:"1px solid rgba(20,241,149,0.2)",
              background:"rgba(20,241,149,0.04)"}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:"#14F195"}}/>
              <span style={{fontSize:"0.44rem",fontWeight:700,
                color:"rgba(255,255,255,0.6)",fontFamily:"'JetBrains Mono',monospace"}}>
                {shortPk(publicKey?.toBase58()??"")}
              </span>
            </div>
            {isVerified?(
              <div style={{display:"flex",alignItems:"center",gap:5,
                padding:"0.35rem 0.65rem",borderRadius:"4px",
                border:"1px solid rgba(107,140,255,0.25)",
                background:"rgba(107,140,255,0.06)"}}>
                <span style={{fontSize:"0.36rem",color:"#6b8cff",
                  fontFamily:"'JetBrains Mono',monospace",fontWeight:700,
                  textTransform:"uppercase",letterSpacing:"0.12em"}}>Authenticated</span>
              </div>
            ):(
              <button onClick={verify} disabled={verifying} style={{
                padding:"0.35rem 0.75rem",borderRadius:"4px",
                border:"1px solid rgba(251,191,36,0.3)",cursor:"pointer",
                fontWeight:700,fontSize:"0.44rem",fontFamily:"'JetBrains Mono',monospace",
                background:"rgba(251,191,36,0.07)",color:"#FBBF24"}}>
                {verifying?"Awaiting Signature":"Sign to Authenticate"}
              </button>
            )}
            {error&&<span style={{fontSize:"0.42rem",color:"#f26b6b",
              fontFamily:"'JetBrains Mono',monospace"}}>{error}</span>}
          </div>
        )}
      </div>

      {/* AUTHENTICATION STANDARD */}
      <div style={{marginBottom:"2.5rem"}}>
        <div style={{padding:"1.75rem",border:"1px solid rgba(200,169,110,0.2)",
          borderRadius:"8px",background:"rgba(200,169,110,0.03)"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:"1.25rem",
            marginBottom:"1.25rem"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:"0.34rem",fontWeight:700,letterSpacing:"0.2em",
                color:"rgba(200,169,110,0.5)",fontFamily:"'JetBrains Mono',monospace",
                textTransform:"uppercase",marginBottom:"0.4rem"}}>Proprietary Protocol</div>
              <h2 style={{fontWeight:900,fontSize:"1.2rem",color:"#f0f0f0",
                margin:"0 0 0.625rem",letterSpacing:"-0.03em",lineHeight:1.08}}>
                Abraxas Authentication Standard
              </h2>
              <p style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.35)",
                lineHeight:1.75,margin:0,maxWidth:520}}>
                Most tokenization platforms stop at minting. Abraxas continues through a
                proprietary five-stage authentication pipeline that creates a provable,
                auditable chain of custody for every asset. This verification standard is
                built in-house. Every verification event is recorded on Solana and remains
                publicly auditable in perpetuity.
              </p>
            </div>
            <div style={{padding:"0.5rem 0.875rem",borderRadius:"5px",
              background:"rgba(200,169,110,0.08)",
              border:"1px solid rgba(200,169,110,0.2)",flexShrink:0}}>
              <div style={{fontSize:"0.3rem",fontWeight:700,color:"rgba(200,169,110,0.5)",
                fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
                letterSpacing:"0.15em",marginBottom:3}}>Standard</div>
              <div style={{fontSize:"0.7rem",fontWeight:900,color:"#C8A96E",
                fontFamily:"'JetBrains Mono',monospace"}}>AAS-1</div>
            </div>
          </div>
          {[
            {n:"01",col:"#C8A96E",
              title:"Asset Submission and Metadata Hash",
              tech:"Token-2022 metadata extension with immutable on-chain fingerprint",
              plain:"Documentation, images, and provenance records are hashed and permanently recorded on Solana at the moment of submission. The metadata fingerprint cannot be altered after minting."},
            {n:"02",col:"#FBBF24",
              title:"Ownership Verification",
              tech:"Signed wallet authentication with anti-spoof session binding",
              plain:"The submitting wallet signs a protocol message, binding the on-chain token to a proven wallet controller. This prevents tokenization by parties who do not control the associated wallet."},
            {n:"03",col:"#FBBF24",
              title:"Custody Validation",
              tech:"Physical inspection with co-signed on-chain state transition",
              plain:"A verified institutional custodian physically inspects the asset and co-signs the on-chain state change. Without custodian sign-off, the asset status cannot advance. This step is irreversible."},
            {n:"04",col:"#14F195",
              title:"Borrow Eligibility Qualification",
              tech:"LTV assignment per asset class, lending market integration",
              plain:"Once verified, the asset receives a class-based loan-to-value ratio and becomes eligible for USDC borrowing. The lending qualification is tied to the on-chain verified status, not a self-asserted claim."},
            {n:"05",col:"#6b8cff",
              title:"Transfer Protection",
              tech:"Dual signature requirement for all transfers and liquidation events",
              plain:"No transfer of the underlying physical asset can occur without both the owner wallet signature and the custody co-signature. A compromised private key cannot enable physical delivery."},
          ].map((s,i)=>(
            <div key={s.n} style={{display:"grid",gridTemplateColumns:"2.5rem 1fr",
              gap:"0.875rem",padding:"0.875rem 0",
              borderTop:"1px solid rgba(255,255,255,0.05)",alignItems:"start"}}>
              <div style={{fontSize:"0.32rem",fontWeight:700,color:`${s.col}50`,
                fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.12em",
                paddingTop:3}}>{s.n}</div>
              <div>
                <div style={{fontWeight:800,fontSize:"0.64rem",color:"#f0f0f0",
                  marginBottom:"0.18rem"}}>{s.title}</div>
                <div style={{fontSize:"0.34rem",color:`${s.col}70`,
                  fontFamily:"'JetBrains Mono',monospace",
                  marginBottom:"0.3rem"}}>{s.tech}</div>
                <div style={{fontSize:"0.46rem",color:"rgba(255,255,255,0.28)",
                  lineHeight:1.7}}>{s.plain}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PORTFOLIO REGISTRY */}
      <Rule label="Asset Registry"/>
      {!connected?(
        <div style={{padding:"2.5rem 2rem",textAlign:"center",
          border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",
          background:"rgba(255,255,255,0.01)"}}>
          <div style={{fontSize:"0.6rem",fontWeight:700,
            color:"rgba(255,255,255,0.18)",marginBottom:"0.4rem"}}>
            Connect wallet to view your positions
          </div>
          <div style={{fontSize:"0.46rem",color:"rgba(255,255,255,0.12)",
            lineHeight:1.65,maxWidth:340,margin:"0 auto 1rem"}}>
            Your tokenized asset registry, ABRA balance, and borrow capacity
            will appear here once connected.
          </div>
          <button onClick={()=>setVisible(true)} style={{padding:"0.6rem 1.25rem",
            borderRadius:"6px",border:"none",cursor:"pointer",fontWeight:700,
            fontSize:"0.58rem",fontFamily:"'JetBrains Mono',monospace",
            background:"#7c3aed",color:"#fff"}}>Connect Wallet</button>
        </div>
      ):assets.length===0?(
        <div style={{padding:"2.5rem 2rem",textAlign:"center",
          border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",
          background:"rgba(255,255,255,0.01)"}}>
          <div style={{fontSize:"0.6rem",fontWeight:700,
            color:"rgba(255,255,255,0.18)",marginBottom:"0.4rem"}}>
            No assets on record
          </div>
          <div style={{fontSize:"0.46rem",color:"rgba(255,255,255,0.12)",
            lineHeight:1.7,maxWidth:380,margin:"0 auto 1rem"}}>
            Tokenize a real-world asset below to create your first verified on-chain position.
            Once authenticated, it becomes eligible for USDC borrowing via Loopscale.
          </div>
          <button onClick={openStudio} style={{padding:"0.6rem 1.25rem",borderRadius:"6px",
            border:"1px solid rgba(200,169,110,0.3)",cursor:"pointer",fontWeight:700,
            fontSize:"0.58rem",fontFamily:"'JetBrains Mono',monospace",
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
                <div style={{fontSize:"0.36rem",color:"rgba(20,241,149,0.4)",
                  fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
                  letterSpacing:"0.12em",marginBottom:3}}>Borrow Capacity</div>
                <div style={{fontSize:"1rem",fontWeight:900,color:"#14F195",
                  fontFamily:"'JetBrains Mono',monospace"}}>{fmtUsd(totalBorrowable)} USDC</div>
              </div>
              <button onClick={()=>window.open("https://app.loopscale.com","_blank","noopener")}
                style={{padding:"0.5rem 1rem",borderRadius:"6px",
                  border:"1px solid rgba(107,140,255,0.35)",cursor:"pointer",
                  fontWeight:700,fontSize:"0.54rem",fontFamily:"'JetBrains Mono',monospace",
                  background:"rgba(107,140,255,0.07)",color:"#6b8cff"}}>
                Borrow via Loopscale
              </button>
            </div>
          )}
          <div style={{border:"1px solid rgba(255,255,255,0.06)",borderRadius:"7px",
            overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 60px",
              padding:"0.45rem 1rem",gap:"0.5rem",
              borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
              {["Asset","Value","Borrow Cap","Status",""].map(h=>(
                <div key={h} style={{fontSize:"0.3rem",fontWeight:700,
                  color:"rgba(255,255,255,0.18)",fontFamily:"'JetBrains Mono',monospace",
                  textTransform:"uppercase",letterSpacing:"0.14em"}}>{h}</div>
              ))}
            </div>
            {shown.map(a=><AssetRow key={a.id} a={a}/>)}
          </div>
          {verified.length>3&&(
            <button onClick={()=>setShowAll(s=>!s)} style={{width:"100%",marginTop:"0.5rem",
              padding:"0.5rem",borderRadius:"5px",
              border:"1px solid rgba(255,255,255,0.07)",cursor:"pointer",
              fontSize:"0.44rem",fontWeight:600,fontFamily:"'JetBrains Mono',monospace",
              background:"rgba(255,255,255,0.02)",color:"rgba(255,255,255,0.3)"}}>
              {showAll?`Show fewer`:`View all ${verified.length} assets`}
            </button>
          )}
        </>
      )}

      {/* PENDING */}
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
                        {a.name}</div>
                      <div style={{fontSize:"0.34rem",color:"rgba(255,255,255,0.2)",
                        fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>
                        {a.assetClass}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:5,
                      padding:"0.18rem 0.5rem",borderRadius:"3px",
                      border:`1px solid ${st.color}25`,
                      background:`${st.color}08`,flexShrink:0}}>
                      <div style={{width:4,height:4,borderRadius:"50%",
                        background:st.color,animation:"pulse 1.5s ease-in-out infinite"}}/>
                      <span style={{fontSize:"0.32rem",fontWeight:700,color:st.color,
                        fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
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

      {/* ABRA TOKEN */}
      <Rule label="ABRA Token"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.625rem",
        marginBottom:"2rem"}}>
        <div style={{gridColumn:"1/-1",padding:"0.875rem 1rem",
          border:"1px solid rgba(255,255,255,0.07)",borderRadius:"7px"}}>
          <div style={{fontSize:"0.3rem",fontWeight:700,color:"rgba(255,255,255,0.18)",
            fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
            letterSpacing:"0.18em",marginBottom:"0.4rem"}}>Contract Address on Solana</div>
          <div style={{display:"flex",alignItems:"center",gap:"0.625rem",flexWrap:"wrap"}}>
            <code style={{fontSize:"0.46rem",color:"rgba(255,255,255,0.5)",
              fontFamily:"'JetBrains Mono',monospace",flex:1,wordBreak:"break-all"}}>
              {ABRA_CA}
            </code>
            <button onClick={()=>navigator.clipboard.writeText(ABRA_CA)} style={{
              padding:"0.18rem 0.5rem",borderRadius:"3px",
              border:"1px solid rgba(255,255,255,0.1)",
              background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.3)",
              fontSize:"0.34rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace"}}>
              Copy
            </button>
          </div>
        </div>
        <div style={{padding:"0.875rem 1rem",
          border:"1px solid rgba(200,169,110,0.18)",borderRadius:"7px",
          background:"rgba(200,169,110,0.04)"}}>
          <div style={{fontSize:"0.3rem",fontWeight:700,color:"rgba(200,169,110,0.45)",
            fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
            letterSpacing:"0.18em",marginBottom:"0.35rem"}}>Wallet Balance</div>
          <div style={{fontSize:"1.1rem",fontWeight:900,color:"#C8A96E",
            fontFamily:"'JetBrains Mono',monospace",lineHeight:1,marginBottom:3}}>
            {balLoading?"...":displayBalance.toLocaleString()}
          </div>
          <div style={{fontSize:"0.38rem",color:"rgba(200,169,110,0.4)",
            fontFamily:"'JetBrains Mono',monospace"}}>
            {connected?"Live on-chain balance":"Demo balance"}
          </div>
        </div>
        <div style={{padding:"0.875rem 1rem",
          border:"1px solid rgba(255,255,255,0.07)",borderRadius:"7px"}}>
          <div style={{fontSize:"0.3rem",fontWeight:700,color:"rgba(255,255,255,0.18)",
            fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
            letterSpacing:"0.18em",marginBottom:"0.625rem"}}>Acquire ABRA</div>
          {([
            ["Jupiter (Primary)", SWAP_URL,    "#14F195"],
            ["Raydium",           RAYDIUM_URL, "#6b8cff"],
          ] as [string,string,string][]).map(([n,u,c])=>(
            <a key={n} href={u} target="_blank" rel="noopener noreferrer"
              style={{display:"flex",justifyContent:"space-between",padding:"0.3rem 0",
                borderBottom:"1px solid rgba(255,255,255,0.04)",textDecoration:"none"}}>
              <span style={{fontSize:"0.44rem",fontWeight:700,color:c,
                fontFamily:"'JetBrains Mono',monospace"}}>{n}</span>
              <span style={{fontSize:"0.34rem",color:"rgba(255,255,255,0.2)",
                fontFamily:"'JetBrains Mono',monospace"}}>Trade</span>
            </a>
          ))}
        </div>
      </div>

      {/* STUDIO */}
      <Rule label="Tokenization Studio"/>
      <div ref={studioRef}>
        {!showStudio?(
          <div style={{padding:"1.75rem 1.5rem",
            border:"1px solid rgba(255,255,255,0.07)",borderRadius:"7px",
            background:"rgba(255,255,255,0.01)"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",
              gap:"1.25rem",alignItems:"start",marginBottom:"1.5rem"}}>
              <div>
                <h3 style={{fontWeight:900,fontSize:"0.9rem",color:"#f0f0f0",
                  margin:"0 0 0.4rem"}}>Begin Asset Tokenization</h3>
                <p style={{fontSize:"0.46rem",color:"rgba(255,255,255,0.28)",
                  lineHeight:1.7,margin:0}}>
                  Submit any physical asset through the Abraxas verification pipeline.
                  Any asset class carrying provable real-world value can be verified and
                  issued as a Token-2022 position on Solana.
                </p>
              </div>
              <button onClick={openStudio} style={{padding:"0.7rem 1.4rem",
                borderRadius:"5px",border:"none",cursor:"pointer",fontWeight:800,
                fontSize:"0.6rem",fontFamily:"'JetBrains Mono',monospace",
                letterSpacing:"0.05em",background:"#7c3aed",color:"#fff",
                whiteSpace:"nowrap"}}>Start</button>
            </div>
            <div style={{display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,138px),1fr))",
              gap:"0.4rem"}}>
              {([
                ["Watches",        "#6b8cff","◎","65% LTV"],
                ["Spirits",        "#FF8C00","◈","55% LTV"],
                ["Cards (PSA/BGS)","#FBBF24","⬡","55% LTV"],
                ["Comics (CGC)",   "#a855f7","◫","65% LTV"],
                ["Metals",         "#D4AF37","◆","80% LTV"],
                ["Art",            "#f26b6b","◭","50% LTV"],
                ["Racehorses",     "#22c55e","◉","55% LTV"],
                ["Other",          "#C8A96E","⬢","45% LTV"],
              ] as [string,string,string,string][]).map(([nm,col,icon,ltv])=>(
                <div key={nm} onClick={openStudio} style={{padding:"0.7rem 0.75rem",
                  borderRadius:"5px",cursor:"pointer",
                  border:`1px solid ${col}18`,background:`${col}05`,transition:"all 0.15s"}}
                onMouseEnter={e=>{
                  const el=e.currentTarget as HTMLDivElement;
                  el.style.background=`${col}10`;el.style.borderColor=`${col}35`;
                }}
                onMouseLeave={e=>{
                  const el=e.currentTarget as HTMLDivElement;
                  el.style.background=`${col}05`;el.style.borderColor=`${col}18`;
                }}>
                  <div style={{fontSize:"0.88rem",color:col,opacity:0.6,
                    marginBottom:"0.2rem",lineHeight:1}}>{icon}</div>
                  <div style={{fontWeight:800,fontSize:"0.52rem",color:"#f0f0f0",
                    marginBottom:2}}>{nm}</div>
                  <div style={{fontSize:"0.3rem",color:"rgba(255,255,255,0.18)",
                    fontFamily:"'JetBrains Mono',monospace"}}>{ltv}</div>
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
              <span style={{fontSize:"0.32rem",fontWeight:700,
                color:"rgba(255,255,255,0.18)",fontFamily:"'JetBrains Mono',monospace",
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