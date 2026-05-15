// FILE: components/PortfolioTab.tsx
"use client";
// Abraxas — Verification Intelligence Layer
// Bloomberg Terminal aesthetic · Hyperliquid precision · No fake data
"use client";

import { useState, useEffect, useRef }   from "react";
import { useWallet }                     from "@solana/wallet-adapter-react";
import { useWalletModal }                from "@solana/wallet-adapter-react-ui";
import { useAbraStore }                  from "@/lib/abraxasStore";
import { useWalletAuth }                 from "@/lib/hooks/useWalletAuth";
import { usePortfolioIntelligence,
         type IntelligenceField }        from "@/lib/hooks/usePortfolioIntelligence";
import { ABRA_GATE }                     from "@/lib/hooks/useAbraBalance";
import { IssuanceEngine }               from "@/components/IssuanceEngine";

const ABRA_CA     = "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS";
const RAYDIUM_URL = `https://raydium.io/swap/?inputCurrency=sol&outputCurrency=${ABRA_CA}`;
const JUPITER_URL = `https://jup.ag/swap/SOL-${ABRA_CA}`;

type AbraAsset = ReturnType<typeof useAbraStore.getState>["assets"][0];

const STATUS_META: Record<string,{label:string;color:string;step:number}> = {
  created:              {label:"Submitted",         color:"#C8A96E",step:1},
  pending_soft:         {label:"Metadata Review",   color:"#FBBF24",step:2},
  pending_standard:     {label:"Custody Check",     color:"#FBBF24",step:4},
  pending_verification: {label:"Ownership Check",   color:"#FBBF24",step:3},
  verified:             {label:"Borrow Eligible",   color:"#14F195",step:7},
  collateral_eligible:  {label:"Borrow Eligible",  color:"#14F195",step:7},
  borrowed:             {label:"Active Loan",       color:"#6b8cff",step:8},
  listed:               {label:"Marketplace Ready", color:"#14F195",step:8},
  closed:               {label:"Closed",            color:"rgba(255,255,255,0.2)",step:0},
};

const PIPELINE = [
  "Submitted","Metadata Review","Ownership Verification",
  "Custody Validation","Liquidity Analysis",
  "Appraisal Confirmation","Borrow Eligibility","Marketplace Ready",
];

function fmtUsd(n:number|null):string {
  if(n===null) return "—";
  if(n===0)    return "$0";
  return n>=1_000_000?`$${(n/1e6).toFixed(2)}M`:n>=1000?`$${(n/1000).toFixed(1)}K`:`$${n.toFixed(0)}`;
}
function fmtAbra(n:number|null):string {
  if(n===null) return "—";
  return n.toLocaleString();
}
function shortPk(k:string):string {
  return k.length>12?`${k.slice(0,6)}…${k.slice(-4)}`:k;
}

// ── Intelligence metric cell ──────────────────────────────────────────────────
function MetricCell({field,fmt,unit}:{
  field:IntelligenceField<unknown>;
  fmt?:(v:unknown)=>string;
  unit?:string;
}) {
  const display = field.value === null
    ? (field.status==="pending" ? "Pending Sync" : "Unavailable")
    : (fmt ? fmt(field.value) : String(field.value)) + (unit?` ${unit}`:"");

  const isLive    = field.status === "live" && field.value !== null;
  const isPending = field.status === "pending" || field.value === null;

  return (
    <div style={{padding:"0.875rem 1rem"}}>
      <div style={{
        fontSize:"0.32rem",fontWeight:700,letterSpacing:"0.18em",
        textTransform:"uppercase",marginBottom:"0.35rem",
        color:"rgba(255,255,255,0.22)",fontFamily:"'JetBrains Mono',monospace",
      }}>{field.label}</div>
      <div style={{
        fontSize:"0.9rem",fontWeight:900,lineHeight:1,
        fontFamily:"'JetBrains Mono',monospace",
        color: isPending ? "rgba(255,255,255,0.18)" : "#f0f0f0",
        fontStyle: isPending ? "italic" : "normal",
      }}>{display}</div>
      {isLive && (
        <div style={{display:"flex",alignItems:"center",gap:3,marginTop:3}}>
          <div style={{width:3,height:3,borderRadius:"50%",background:"#14F195"}}/>
          <span style={{fontSize:"0.3rem",color:"rgba(20,241,149,0.4)",
            fontFamily:"'JetBrains Mono',monospace"}}>LIVE</span>
        </div>
      )}
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({label,sub}:{label:string;sub?:string}) {
  return (
    <div style={{marginBottom:"1rem",paddingBottom:"0.625rem",
      borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
      <div style={{fontSize:"0.36rem",fontWeight:700,
        color:"rgba(255,255,255,0.2)",letterSpacing:"0.2em",
        fontFamily:"'JetBrains Mono',monospace",
        textTransform:"uppercase"}}>{label}</div>
      {sub&&<div style={{fontSize:"0.44rem",color:"rgba(255,255,255,0.3)",
        marginTop:3,lineHeight:1.5}}>{sub}</div>}
    </div>
  );
}

// ── Verification pipeline bar ─────────────────────────────────────────────────
function PipelineBar({step}:{step:number}) {
  return (
    <div style={{marginTop:"0.625rem"}}>
      <div style={{display:"flex",gap:"2px",marginBottom:"0.3rem"}}>
        {PIPELINE.map((_,i)=>(
          <div key={i} style={{
            flex:1,height:"3px",borderRadius:2,
            background:i<step?"#14F195":i===step-1?"#FBBF24":"rgba(255,255,255,0.07)",
            transition:"background 0.4s",
          }}/>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <span style={{fontSize:"0.34rem",color:"rgba(255,255,255,0.25)",
          fontFamily:"'JetBrains Mono',monospace"}}>
          {step>0?PIPELINE[step-1]:"—"}
        </span>
        <span style={{fontSize:"0.34rem",color:"rgba(255,255,255,0.18)",
          fontFamily:"'JetBrains Mono',monospace"}}>{step}/{PIPELINE.length}</span>
      </div>
    </div>
  );
}

// ── Asset intelligence row ────────────────────────────────────────────────────
function AssetRow({a}:{a:AbraAsset}) {
  const [open,setOpen] = useState(false);
  const st  = STATUS_META[a.status] ?? STATUS_META["created"];
  const borrow = a.estimatedUsd>0?Math.round(a.estimatedUsd*a.ltv/100):0;
  return (
    <div style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{
        display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 80px",
        padding:"0.75rem 1rem",gap:"0.5rem",alignItems:"center",cursor:"pointer",
      }}>
        <div>
          <div style={{fontWeight:700,fontSize:"0.62rem",color:"#f0f0f0",
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div>
          <div style={{fontSize:"0.34rem",color:"rgba(255,255,255,0.2)",
            fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>{a.assetClass}</div>
        </div>
        <div style={{fontSize:"0.56rem",fontWeight:700,color:"#f0f0f0",
          fontFamily:"'JetBrains Mono',monospace"}}>
          {a.estimatedUsd>0?fmtUsd(a.estimatedUsd):"—"}
        </div>
        <div style={{fontSize:"0.54rem",color:borrow>0?"#14F195":"rgba(255,255,255,0.18)",
          fontFamily:"'JetBrains Mono',monospace"}}>
          {borrow>0?fmtUsd(borrow):"—"}
        </div>
        <div style={{fontSize:"0.36rem",fontWeight:600,color:st.color,
          fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
          letterSpacing:"0.08em"}}>{st.label}</div>
        <div style={{textAlign:"right",fontSize:"0.44rem",
          color:"rgba(255,255,255,0.2)"}}>
          {open?"▲":"▼"}
        </div>
      </div>
      {open&&(
        <div style={{padding:"0 1rem 0.875rem",display:"grid",
          gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
          <div>
            <div style={{fontSize:"0.34rem",color:"rgba(255,255,255,0.2)",
              fontFamily:"'JetBrains Mono',monospace",
              textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:3}}>
              Verification Pipeline
            </div>
            <PipelineBar step={st.step}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"0.35rem"}}>
            {([
              ["Custody Partner",  a.custodyPartner||"—"],
              ["LTV Cap",          `${a.ltv}%`],
              ["ABRA Spent",       fmtAbra(a.mintCostAbra)+" ABRA"],
              ["Token ID",         shortPk(a.tokenId||"—")],
            ] as [string,string][]).map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",
                padding:"0.25rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <span style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.2)",
                  fontFamily:"'JetBrains Mono',monospace",
                  textTransform:"uppercase",letterSpacing:"0.1em"}}>{k}</span>
                <span style={{fontSize:"0.4rem",fontWeight:600,
                  color:"rgba(255,255,255,0.55)",fontFamily:"'JetBrains Mono',monospace"}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function PortfolioTab() {
  const [mounted,    setMounted]   = useState(false);
  const [showStudio, setShowStudio]= useState(false);
  const [authPrompt, setAuthPrompt]= useState(false);
  const studioRef                  = useRef<HTMLDivElement>(null);

  const { connected, publicKey }    = useWallet();
  const { setVisible }              = useWalletModal();
  const { session, isVerified,
          verifying, error, verify } = useWalletAuth();
  const intel                       = usePortfolioIntelligence();
  const assets                      = useAbraStore(s => s.assets);

  useEffect(()=>{
    setMounted(true);
  },[]);

  // Prompt for signature when wallet connects and not yet verified
  useEffect(()=>{
    if(connected && !isVerified && !verifying) setAuthPrompt(true);
    else setAuthPrompt(false);
  },[connected, isVerified, verifying]);

  if(!mounted) return null;

  const pending  = assets.filter(a=>STATUS_META[a.status]?.step<7 && a.status!=="closed");
  const verified = assets.filter(a=>STATUS_META[a.status]?.step>=7 && a.status!=="closed");

  function openStudio(){
    setShowStudio(true);
    setTimeout(()=>studioRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),150);
  }

  return (
    <div style={{maxWidth:920,margin:"0 auto",fontFamily:"inherit"}}>

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <div style={{
        padding:"2.5rem 0 2rem",
        borderBottom:"1px solid rgba(255,255,255,0.06)",
        marginBottom:"2rem",
      }}>
        <div style={{
          display:"inline-flex",alignItems:"center",gap:6,
          padding:"0.18rem 0.625rem",borderRadius:"3px",
          border:"1px solid rgba(200,169,110,0.2)",
          background:"rgba(200,169,110,0.05)",marginBottom:"1.25rem",
        }}>
          <div style={{width:4,height:4,borderRadius:"50%",
            background:"#C8A96E",animation:"pulse 2s ease-in-out infinite"}}/>
          <span style={{fontSize:"0.34rem",fontWeight:700,
            color:"rgba(200,169,110,0.7)",fontFamily:"'JetBrains Mono',monospace",
            letterSpacing:"0.2em",textTransform:"uppercase"}}>
            Verification Intelligence Layer · Solana
          </span>
        </div>

        <h1 style={{
          fontWeight:900,fontSize:"clamp(1.6rem,3.5vw,2.5rem)",color:"#f0f0f0",
          margin:"0 0 0.75rem",letterSpacing:"-0.04em",lineHeight:1.08,maxWidth:640,
        }}>
          Your assets have capital.<br/>
          <span style={{color:"#C8A96E"}}>Most of it is invisible.</span>
        </h1>
        <p style={{
          fontSize:"0.54rem",color:"rgba(255,255,255,0.38)",
          lineHeight:1.8,maxWidth:560,margin:"0 0 1.75rem",
        }}>
          Abraxas is the verification and capital intelligence layer for tokenized 
          real-world assets on Solana. Not a minting platform. A verification protocol —
          turning physical assets into authenticated on-chain collateral through
          multi-party custody validation, on-chain state transitions, and
          institutional lending qualification.
        </p>

        {!connected ? (
          <div style={{display:"flex",gap:"0.625rem",flexWrap:"wrap"}}>
            <button onClick={()=>setVisible(true)} style={{
              padding:"0.7rem 1.4rem",borderRadius:"5px",border:"none",
              cursor:"pointer",fontWeight:800,fontSize:"0.6rem",
              fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.05em",
              background:"#7c3aed",color:"#fff",
            }}>Connect & Authenticate</button>
            <button onClick={openStudio} style={{
              padding:"0.7rem 1.4rem",borderRadius:"5px",
              border:"1px solid rgba(255,255,255,0.1)",
              cursor:"pointer",fontWeight:600,fontSize:"0.58rem",
              fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em",
              background:"transparent",color:"rgba(255,255,255,0.4)",
            }}>Explore Studio</button>
          </div>
        ) : (
          <div style={{display:"flex",alignItems:"center",gap:"0.75rem",flexWrap:"wrap"}}>
            <div style={{
              display:"flex",alignItems:"center",gap:6,
              padding:"0.4rem 0.75rem",borderRadius:"4px",
              border:"1px solid rgba(20,241,149,0.2)",
              background:"rgba(20,241,149,0.04)",
            }}>
              <div style={{width:5,height:5,borderRadius:"50%",background:"#14F195"}}/>
              <span style={{fontSize:"0.44rem",fontWeight:700,
                color:"rgba(255,255,255,0.6)",fontFamily:"'JetBrains Mono',monospace"}}>
                {shortPk(publicKey?.toBase58()??"")}
              </span>
            </div>
            {isVerified ? (
              <div style={{
                display:"flex",alignItems:"center",gap:5,
                padding:"0.35rem 0.65rem",borderRadius:"4px",
                border:"1px solid rgba(107,140,255,0.25)",
                background:"rgba(107,140,255,0.06)",
              }}>
                <span style={{fontSize:"0.38rem",color:"#6b8cff",
                  fontFamily:"'JetBrains Mono',monospace",fontWeight:700,
                  textTransform:"uppercase",letterSpacing:"0.1em"}}>
                  AUTHENTICATED
                </span>
              </div>
            ) : (
              <button onClick={verify} disabled={verifying} style={{
                padding:"0.35rem 0.75rem",borderRadius:"4px",
                border:"1px solid rgba(251,191,36,0.3)",
                cursor:"pointer",fontWeight:700,fontSize:"0.44rem",
                fontFamily:"'JetBrains Mono',monospace",
                background:"rgba(251,191,36,0.07)",color:"#FBBF24",
              }}>
                {verifying?"Awaiting Signature…":"Sign to Authenticate →"}
              </button>
            )}
            {error&&(
              <span style={{fontSize:"0.42rem",color:"#f26b6b",
                fontFamily:"'JetBrains Mono',monospace"}}>{error}</span>
            )}
          </div>
        )}
      </div>

      {/* ══ CAPITAL INTELLIGENCE DASHBOARD ══════════════════════════════ */}
      <div style={{marginBottom:"2.5rem"}}>
        <SectionLabel label="Capital Intelligence"
          sub={connected&&isVerified
            ?"Live metrics derived from verified on-chain positions"
            :"Connect and authenticate your wallet to access live intelligence"}/>

        {/* Primary metrics grid */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",
          gap:"1px",background:"rgba(255,255,255,0.06)",
          border:"1px solid rgba(255,255,255,0.06)",
          borderRadius:"8px",overflow:"hidden",marginBottom:"1px",
        }}>
          {([
            {field:intel.totalDeclaredValueUsd, fmt:fmtUsd},
            {field:intel.borrowingPowerUsd,     fmt:fmtUsd},
            {field:intel.verifiedAssetCount,    fmt:(v:number)=>String(v)},
            {field:intel.abraConsumedTotal,     fmt:(v:number)=>fmtAbra(v),unit:"ABRA"},
          ] as const).map((m,i)=>(
            <div key={i} style={{background:"rgba(6,8,16,0.99)"}}>
              <MetricCell field={m.field as IntelligenceField<number>}
                fmt={m.fmt as (v:number)=>string}/>
            </div>
          ))}
        </div>

        {/* Secondary metrics — pending/unavailable sourced */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",
          gap:"1px",background:"rgba(255,255,255,0.04)",
          border:"1px solid rgba(255,255,255,0.06)",
          borderRadius:"8px",overflow:"hidden",marginTop:"1px",
        }}>
          {([
            intel.walletTrustScore,
            intel.healthFactor,
            intel.activeLoansUsd,
            intel.liquidationRisk,
            intel.assetQualityScore,
            intel.capitalBehaviorScore,
          ] as IntelligenceField<unknown>[]).map((f,i)=>(
            <div key={i} style={{background:"rgba(6,8,16,0.95)"}}>
              <MetricCell field={f}/>
            </div>
          ))}
        </div>

        {!connected&&(
          <div style={{
            marginTop:"0.625rem",padding:"0.5rem 0.875rem",
            border:"1px solid rgba(255,255,255,0.05)",borderRadius:"5px",
            background:"rgba(255,255,255,0.01)",
          }}>
            <span style={{fontSize:"0.4rem",color:"rgba(255,255,255,0.2)",
              fontFamily:"'JetBrains Mono',monospace"}}>
              All metrics require wallet authentication. External API integrations 
              (Helius · Loopscale · Birdeye) pending setup.
            </span>
          </div>
        )}
      </div>

      {/* ══ VERIFIED ASSETS ═════════════════════════════════════════════ */}
      <div style={{marginBottom:"2.5rem"}}>
        <SectionLabel label="Verified Asset Registry"
          sub="On-chain positions passing full verification pipeline"/>

        {verified.length===0?(
          <div style={{
            padding:"2rem",textAlign:"center",
            border:"1px solid rgba(255,255,255,0.05)",
            borderRadius:"7px",background:"rgba(255,255,255,0.01)",
          }}>
            <div style={{fontSize:"0.54rem",fontWeight:700,
              color:"rgba(255,255,255,0.15)",marginBottom:"0.3rem"}}>
              No verified positions
            </div>
            <div style={{fontSize:"0.44rem",color:"rgba(255,255,255,0.1)",
              lineHeight:1.6,maxWidth:340,margin:"0 auto"}}>
              Submit an asset below and complete the verification pipeline
              to establish your first verified on-chain position.
            </div>
          </div>
        ):(
          <div style={{border:"1px solid rgba(255,255,255,0.06)",
            borderRadius:"7px",overflow:"hidden"}}>
            <div style={{display:"grid",
              gridTemplateColumns:"2fr 1fr 1fr 1fr 80px",
              padding:"0.45rem 1rem",gap:"0.5rem",
              borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
              {["Asset","Value","Borrow Cap","Status",""].map(h=>(
                <div key={h} style={{fontSize:"0.32rem",fontWeight:700,
                  color:"rgba(255,255,255,0.18)",
                  fontFamily:"'JetBrains Mono',monospace",
                  textTransform:"uppercase",letterSpacing:"0.14em"}}>{h}</div>
              ))}
            </div>
            {verified.map(a=><AssetRow key={a.id} a={a}/>)}
          </div>
        )}
      </div>

      {/* ══ PENDING VERIFICATION ════════════════════════════════════════ */}
      {pending.length>0&&(
        <div style={{marginBottom:"2.5rem"}}>
          <SectionLabel label="Pending Verification"
            sub="Assets progressing through the authentication pipeline"/>
          <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
            {pending.map(a=>{
              const st=STATUS_META[a.status]??STATUS_META["created"];
              return (
                <div key={a.id} style={{
                  padding:"0.875rem 1rem",
                  border:"1px solid rgba(255,255,255,0.06)",
                  borderRadius:"7px",background:"rgba(255,255,255,0.01)",
                }}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"center",marginBottom:"0.625rem",gap:"0.5rem"}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:"0.62rem",color:"#f0f0f0"}}>
                        {a.name}</div>
                      <div style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.2)",
                        fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>
                        {a.assetClass} · {a.custodyPartner}</div>
                    </div>
                    <div style={{
                      display:"flex",alignItems:"center",gap:5,
                      padding:"0.2rem 0.5rem",borderRadius:"3px",
                      border:`1px solid ${st.color}25`,
                      background:`${st.color}08`,flexShrink:0,
                    }}>
                      <div style={{width:4,height:4,borderRadius:"50%",
                        background:st.color,
                        animation:"pulse 1.5s ease-in-out infinite"}}/>
                      <span style={{fontSize:"0.34rem",fontWeight:700,
                        color:st.color,fontFamily:"'JetBrains Mono',monospace",
                        textTransform:"uppercase",letterSpacing:"0.08em"}}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                  <PipelineBar step={st.step}/>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ LENDING (future Loopscale/Kamino) ════════════════════════════ */}
      <div style={{marginBottom:"2.5rem"}}>
        <SectionLabel label="Lending Positions"
          sub="Active loans · collateral utilization · health metrics"/>
        <div style={{
          padding:"1.5rem 1.25rem",
          border:"1px solid rgba(255,255,255,0.06)",
          borderRadius:"7px",
          display:"flex",justifyContent:"space-between",
          alignItems:"center",flexWrap:"wrap",gap:"1rem",
        }}>
          <div>
            <div style={{fontSize:"0.54rem",fontWeight:700,
              color:"rgba(255,255,255,0.25)",marginBottom:"0.3rem"}}>
              No active loans
            </div>
            <div style={{fontSize:"0.44rem",color:"rgba(255,255,255,0.15)",
              lineHeight:1.6,maxWidth:320}}>
              Verified assets unlock USDC borrowing via Loopscale at a fixed
              5.2% APR. Loopscale live loan data will surface here once integrated.
            </div>
          </div>
          <button onClick={()=>window.open("https://app.loopscale.com","_blank","noopener")}
            style={{
              padding:"0.65rem 1.25rem",borderRadius:"5px",
              border:"1px solid rgba(107,140,255,0.3)",
              cursor:"pointer",fontWeight:700,fontSize:"0.58rem",
              fontFamily:"'JetBrains Mono',monospace",
              background:"rgba(107,140,255,0.07)",color:"#6b8cff",
              whiteSpace:"nowrap",
            }}>Open Loopscale →</button>
        </div>
      </div>

      {/* ══ VERIFICATION SYSTEM ARCHITECTURE ════════════════════════════ */}
      <div style={{marginBottom:"2.5rem"}}>
        <SectionLabel label="Verification Architecture"
          sub="Why Abraxas is different — the verification layer most protocols skip"/>
        <div style={{
          border:"1px solid rgba(255,255,255,0.06)",
          borderRadius:"7px",overflow:"hidden",
        }}>
          {[
            {n:"01",col:"#C8A96E",
              title:"Asset Submission + Metadata Hash",
              tech:"Token-2022 metadata extension · immutable fingerprint on Solana",
              plain:"Documentation, images, and provenance records are hashed and permanently recorded on-chain at submission. The metadata fingerprint cannot be altered post-mint — creating an irrefutable timestamp of ownership claim."},
            {n:"02",col:"#FBBF24",
              title:"Ownership Verification",
              tech:"Signed wallet authentication · anti-spoof session binding",
              plain:"The submitting wallet signs a protocol message, binding the on-chain token to a proven wallet controller. This prevents tokenization of assets by parties who do not control the relevant wallet."},
            {n:"03",col:"#FBBF24",
              title:"Custody Partner Authentication",
              tech:"Co-signature required · Baxus / Courtyard / LBMA / Metropolis",
              plain:"A verified institutional custodian physically inspects the asset, confirms it matches the submission, and co-signs the on-chain state transition. No custodian signature, no status upgrade. Period."},
            {n:"04",col:"#14F195",
              title:"On-Chain State Transition",
              tech:"Atomic: pending_standard → verified → collateral_eligible",
              plain:"Verification triggers an immutable on-chain status change visible to any auditor. This is the provable event that separates Abraxas from platforms where 'verified' is a self-attested label."},
            {n:"05",col:"#6b8cff",
              title:"Lending Qualification + Transfer Protection",
              tech:"LTV assignment · custody co-signature required for any transfer",
              plain:"Once verified, an asset receives a class-based LTV ratio for lending. Critically: no transfer of the underlying physical asset can occur without both the owner's wallet signature AND the custody partner's co-signature. A compromised private key cannot enable physical delivery."},
          ].map((s,i,arr)=>(
            <div key={s.n} style={{
              display:"grid",gridTemplateColumns:"2.5rem 1fr",
              gap:"0.875rem",padding:"1rem 1.25rem",
              borderBottom:i<arr.length-1?"1px solid rgba(255,255,255,0.04)":"none",
              alignItems:"start",
            }}>
              <div style={{
                fontSize:"0.34rem",fontWeight:700,
                color:`${s.col}50`,
                fontFamily:"'JetBrains Mono',monospace",
                letterSpacing:"0.1em",paddingTop:3,
              }}>{s.n}</div>
              <div>
                <div style={{fontWeight:800,fontSize:"0.64rem",color:"#f0f0f0",
                  marginBottom:"0.18rem"}}>{s.title}</div>
                <div style={{fontSize:"0.36rem",color:`${s.col}80`,
                  fontFamily:"'JetBrains Mono',monospace",
                  marginBottom:"0.35rem"}}>{s.tech}</div>
                <div style={{fontSize:"0.46rem",color:"rgba(255,255,255,0.28)",
                  lineHeight:1.7}}>{s.plain}</div>
              </div>
            </div>
          ))}
          <div style={{
            padding:"0.75rem 1.25rem",
            background:"rgba(255,255,255,0.02)",
            borderTop:"1px solid rgba(255,255,255,0.05)",
          }}>
            <span style={{fontSize:"0.4rem",color:"rgba(255,255,255,0.2)",
              fontStyle:"italic"}}>
              Every verification event is auditable on Solana Explorer via the
              token's transaction history. Abraxas publishes the verification trail —
              because transparency is the foundation of institutional trust.
            </span>
          </div>
        </div>
      </div>

      {/* ══ ABRA TOKEN ════════════════════════════════════════════════════ */}
      <div style={{marginBottom:"2.5rem"}}>
        <SectionLabel label="ABRA Token" sub="Protocol access token · required to initiate tokenization"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.625rem"}}>
          <div style={{
            gridColumn:"1/-1",padding:"0.875rem 1rem",
            border:"1px solid rgba(255,255,255,0.07)",borderRadius:"7px",
          }}>
            <div style={{fontSize:"0.32rem",fontWeight:700,
              color:"rgba(255,255,255,0.18)",fontFamily:"'JetBrains Mono',monospace",
              textTransform:"uppercase",letterSpacing:"0.18em",marginBottom:"0.4rem"}}>
              SPL Token · Solana Mainnet
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"0.625rem",flexWrap:"wrap"}}>
              <code style={{fontSize:"0.48rem",color:"rgba(255,255,255,0.5)",
                fontFamily:"'JetBrains Mono',monospace",flex:1,
                wordBreak:"break-all"}}>{ABRA_CA}</code>
              <button onClick={()=>navigator.clipboard.writeText(ABRA_CA)} style={{
                padding:"0.18rem 0.5rem",borderRadius:"3px",
                border:"1px solid rgba(255,255,255,0.1)",
                background:"rgba(255,255,255,0.04)",
                color:"rgba(255,255,255,0.3)",fontSize:"0.36rem",
                cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",
              }}>Copy</button>
            </div>
          </div>
          <div style={{
            padding:"0.875rem 1rem",
            border:"1px solid rgba(200,169,110,0.2)",borderRadius:"7px",
            background:"rgba(200,169,110,0.04)",
          }}>
            <div style={{fontSize:"0.32rem",fontWeight:700,
              color:"rgba(200,169,110,0.45)",fontFamily:"'JetBrains Mono',monospace",
              textTransform:"uppercase",letterSpacing:"0.18em",marginBottom:"0.35rem"}}>
              Required to Mint
            </div>
            <div style={{fontSize:"1.2rem",fontWeight:900,color:"#C8A96E",
              fontFamily:"'JetBrains Mono',monospace",lineHeight:1,marginBottom:3}}>
              {ABRA_GATE.toLocaleString()}
            </div>
            <div style={{fontSize:"0.38rem",color:"rgba(200,169,110,0.4)",
              fontFamily:"'JetBrains Mono',monospace"}}>ABRA minimum balance</div>
          </div>
          <div style={{
            padding:"0.875rem 1rem",
            border:"1px solid rgba(255,255,255,0.07)",borderRadius:"7px",
          }}>
            <div style={{fontSize:"0.32rem",fontWeight:700,
              color:"rgba(255,255,255,0.18)",fontFamily:"'JetBrains Mono',monospace",
              textTransform:"uppercase",letterSpacing:"0.18em",marginBottom:"0.625rem"}}>
              Acquire ABRA
            </div>
            {([
              ["Raydium", RAYDIUM_URL, "#14F195"],
              ["Jupiter", JUPITER_URL, "#6b8cff"],
              ["Bags",    `https://bags.fm/t/${ABRA_CA}`, "#C8A96E"],
            ] as [string,string,string][]).map(([n,u,c])=>(
              <a key={n} href={u} target="_blank" rel="noopener noreferrer"
                style={{
                  display:"flex",justifyContent:"space-between",
                  padding:"0.3rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)",
                  textDecoration:"none",
                }}>
                <span style={{fontSize:"0.44rem",fontWeight:700,color:c,
                  fontFamily:"'JetBrains Mono',monospace"}}>{n}</span>
                <span style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.2)",
                  fontFamily:"'JetBrains Mono',monospace"}}>↗</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ══ TOKENIZATION STUDIO ═════════════════════════════════════════ */}
      <div ref={studioRef} style={{marginBottom:"2rem"}}>
        <SectionLabel label="Tokenization Studio"
          sub="Issue a new verified on-chain position"/>

        {!showStudio?(
          <div style={{
            padding:"1.75rem 1.5rem",
            border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:"7px",background:"rgba(255,255,255,0.01)",
          }}>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",
              gap:"1.25rem",alignItems:"start",marginBottom:"1.5rem",flexWrap:"wrap"}}>
              <div>
                <h3 style={{fontWeight:900,fontSize:"0.9rem",color:"#f0f0f0",
                  margin:"0 0 0.4rem"}}>
                  Begin Asset Tokenization
                </h3>
                <p style={{fontSize:"0.46rem",color:"rgba(255,255,255,0.28)",
                  lineHeight:1.7,margin:0}}>
                  Submit a physical asset through the Abraxas verification pipeline.
                  Any asset class — watches, spirits, metals, art, graded cards,
                  racehorses — if it carries provable real-world value, it can be
                  verified and issued as a Token-2022 position on Solana.
                  Minimum {ABRA_GATE.toLocaleString()} ABRA required.
                </p>
              </div>
              <button onClick={openStudio} style={{
                padding:"0.7rem 1.4rem",borderRadius:"5px",border:"none",
                cursor:"pointer",fontWeight:800,fontSize:"0.6rem",
                fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.05em",
                background:"#7c3aed",color:"#fff",whiteSpace:"nowrap",
              }}>Start →</button>
            </div>
            {/* Asset class grid */}
            <div style={{
              display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,140px),1fr))",
              gap:"0.4rem",
            }}>
              {([
                ["Watches","#6b8cff","◎","Courtyard · 65% LTV"],
                ["Spirits","#FF8C00","◈","Baxus · 55% LTV"],
                ["Cards (PSA/BGS)","#FBBF24","⬡","Collector Crypt · 55% LTV"],
                ["Comics (CGC)","#a855f7","◫","Metropolis · 65% LTV"],
                ["Metals","#D4AF37","◆","LBMA · 80% LTV"],
                ["Art","#f26b6b","◭","Verified Custodian · 50% LTV"],
                ["Racehorses","#22c55e","◉","Jockey Club · 55% LTV"],
                ["Other","#C8A96E","⬢","Manual Review · 45% LTV"],
              ] as [string,string,string,string][]).map(([nm,col,icon,sub])=>(
                <div key={nm} onClick={openStudio}
                  style={{
                    padding:"0.7rem 0.75rem",borderRadius:"5px",cursor:"pointer",
                    border:`1px solid ${col}18`,background:`${col}05`,
                    transition:"all 0.15s",
                  }}
                  onMouseEnter={e=>{
                    const el=e.currentTarget as HTMLDivElement;
                    el.style.background=`${col}10`;
                    el.style.borderColor=`${col}35`;
                  }}
                  onMouseLeave={e=>{
                    const el=e.currentTarget as HTMLDivElement;
                    el.style.background=`${col}05`;
                    el.style.borderColor=`${col}18`;
                  }}>
                  <div style={{fontSize:"0.88rem",color:col,opacity:0.6,
                    marginBottom:"0.2rem",lineHeight:1}}>{icon}</div>
                  <div style={{fontWeight:800,fontSize:"0.52rem",color:"#f0f0f0",
                    marginBottom:2}}>{nm}</div>
                  <div style={{fontSize:"0.32rem",color:"rgba(255,255,255,0.18)",
                    fontFamily:"'JetBrains Mono',monospace",lineHeight:1.35}}>{sub}</div>
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
                color:"rgba(255,255,255,0.18)",fontFamily:"'JetBrains Mono',monospace",
                textTransform:"uppercase",letterSpacing:"0.18em"}}>
                Tokenization Studio
              </span>
              <button onClick={()=>setShowStudio(false)} style={{
                background:"none",border:"none",cursor:"pointer",
                color:"rgba(255,255,255,0.25)",fontSize:"0.75rem",padding:"0 0.2rem",
              }}>×</button>
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

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
      `}</style>
    </div>
  );
}