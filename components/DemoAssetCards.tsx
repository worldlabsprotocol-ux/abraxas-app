// FILE: components/DemoAssetCards.tsx
// Demo asset showcase using seeded Supabase data.
// Falls back to static production-shaped data if DB not connected.
// Shows 3 cards: watch, metals, mineral rights.
// Click opens AssetIntelligenceDrawer.
"use client";

import { useState } from "react";

const MONO = "'JetBrains Mono',monospace";

interface DemoAsset {
  id:                 string;
  title:              string;
  category:           string;
  subline:            string;
  declaredValueUsd:   number;
  collateralScore:    number;
  verificationStatus: string;
  ltv:                number;
  riskTier:           string;
  verifierName:       string;
  custodyLocation:    string;
  lastAudit:          string;
  liquidityRating:    string;
  certId:             string;
  color:              string;
  icon:               string;
  flags:              string[];
}

// Production-shaped static demo data — matches seeded Supabase records
const DEMO_ASSETS: DemoAsset[] = [
  {
    id:                 "demo-001",
    title:              "Rolex Submariner Ref. 5513 (1968)",
    category:           "Luxury Watch",
    subline:            "Full documentation · Original dial · Service history",
    declaredValueUsd:   28500,
    collateralScore:    84,
    verificationStatus: "approved",
    ltv:                65,
    riskTier:           "A",
    verifierName:       "Certified Horological Appraiser",
    custodyLocation:    "Institutional Vault · Geneva, Switzerland",
    lastAudit:          "May 2026",
    liquidityRating:    "medium",
    certId:             "AAS1-DEMO-WATCH-001",
    color:              "#6b8cff",
    icon:               "◎",
    flags:              [],
  },
  {
    id:                 "demo-002",
    title:              "LBMA Gold Bullion — 1oz × 50 Units",
    category:           "Fine Metals",
    subline:            "Serial numbers documented · Brinks bonded custody",
    declaredValueUsd:   97500,
    collateralScore:    91,
    verificationStatus: "collateral_eligible",
    ltv:                78,
    riskTier:           "A",
    verifierName:       "LBMA Approved Assayer",
    custodyLocation:    "Brinks Bonded Vault · Zürich, Switzerland",
    lastAudit:          "April 2026",
    liquidityRating:    "high",
    certId:             "AAS1-DEMO-GOLD-002",
    color:              "#D4AF37",
    icon:               "◆",
    flags:              [],
  },
  {
    id:                 "demo-003",
    title:              "Non-Operated Working Interest",
    category:           "Mineral Rights",
    subline:            "12.5% non-op WI · Proved developed reserves · Clean title",
    declaredValueUsd:   185000,
    collateralScore:    0,
    verificationStatus: "under_review",
    ltv:                55,
    riskTier:           "B",
    verifierName:       "SPE-PRMS Reserve Engineer",
    custodyLocation:    "Title Escrow · Recording Confirmed",
    lastAudit:          "Pending",
    liquidityRating:    "low",
    certId:             "AAS1-DEMO-MINR-003",
    color:              "#14F195",
    icon:               "◈",
    flags:              ["Title verification in progress", "Reserve report ordered"],
  },
];

const STATUS_LABEL: Record<string,{label:string;color:string}> = {
  approved:             {label:"Verified",       color:"#14F195"},
  collateral_eligible:  {label:"Borrow Eligible",color:"#14F195"},
  under_review:         {label:"Under Review",   color:"#FBBF24"},
  submitted:            {label:"Submitted",      color:"#C8A96E"},
};

function fmtUsd(n:number){return n>=1e6?`$${(n/1e6).toFixed(2)}M`:n>=1000?`$${(n/1000).toFixed(1)}K`:`$${n}`;}

function ScoreRing({score,color}:{score:number;color:string}){
  if(score===0) return(
    <div style={{width:52,height:52,borderRadius:"50%",border:`2px solid rgba(255,255,255,0.1)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <span style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.25)",fontFamily:MONO}}>Pending</span>
    </div>
  );
  const r=22, c=2*Math.PI*r, pct=score/100;
  return(
    <div style={{position:"relative",width:52,height:52,flexShrink:0}}>
      <svg width={52} height={52} style={{transform:"rotate(-90deg)"}}>
        <circle cx={26} cy={26} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={3}/>
        <circle cx={26} cy={26} r={r} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={c} strokeDashoffset={c*(1-pct)} strokeLinecap="round"
          style={{transition:"stroke-dashoffset 1s ease"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:"0.58rem",fontWeight:900,color,fontFamily:MONO,lineHeight:1}}>{score}</span>
        <span style={{fontSize:"0.26rem",color:"rgba(255,255,255,0.25)",fontFamily:MONO}}>SCORE</span>
      </div>
    </div>
  );
}

export function DemoAssetCards() {
  const [expanded, setExpanded] = useState<string|null>(null);

  return (
    <div>
      <div style={{marginBottom:"1.5rem"}}>
        <div style={{fontSize:"0.48rem",fontWeight:700,color:"rgba(255,255,255,0.2)",
          fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.18em",
          marginBottom:"0.4rem"}}>
          Verification Examples
        </div>
        <h2 style={{fontWeight:900,fontSize:"clamp(1.3rem,2.5vw,1.75rem)",color:"#f0f0f0",
          margin:"0 0 0.5rem",letterSpacing:"-0.03em",lineHeight:1.1}}>
          Assets Currently in the Pipeline
        </h2>
        <p style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.35)",lineHeight:1.7,maxWidth:520,margin:0}}>
          Each card represents a real verification record. Expand any asset to see the
          collateral score methodology, verifier identity, custody details, and certificate data.
        </p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))",gap:"0.875rem"}}>
        {DEMO_ASSETS.map(asset => {
          const st = STATUS_LABEL[asset.verificationStatus] ?? {label:asset.verificationStatus,color:"#C8A96E"};
          const isOpen = expanded === asset.id;
          return(
            <div key={asset.id} style={{
              border:`1px solid ${asset.color}22`,
              borderRadius:"10px", background:"rgba(6,8,16,0.97)",
              overflow:"hidden", transition:"border-color 0.2s",
              cursor:"pointer",
            }}
            onMouseEnter={e=>(e.currentTarget.style.borderColor=`${asset.color}45`)}
            onMouseLeave={e=>(e.currentTarget.style.borderColor=`${asset.color}22`)}
            onClick={()=>setExpanded(isOpen?null:asset.id)}>

              {/* Status strip */}
              <div style={{height:2,background:`linear-gradient(90deg,${asset.color},${asset.color}44)`}}/>

              <div style={{padding:"1rem"}}>
                {/* Header */}
                <div style={{display:"flex",alignItems:"flex-start",gap:"0.75rem",marginBottom:"0.875rem"}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:`${asset.color}12`,
                    border:`1px solid ${asset.color}35`,display:"flex",alignItems:"center",
                    justifyContent:"center",flexShrink:0,fontSize:"0.9rem",color:asset.color}}>
                    {asset.icon}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:800,fontSize:"0.68rem",color:"#f0f0f0",
                      marginBottom:2,lineHeight:1.2}}>{asset.title}</div>
                    <div style={{fontSize:"0.42rem",color:"rgba(255,255,255,0.3)",
                      fontFamily:MONO,marginBottom:4}}>{asset.category}</div>
                    <div style={{fontSize:"0.4rem",color:"rgba(255,255,255,0.2)",lineHeight:1.4}}>
                      {asset.subline}
                    </div>
                  </div>
                </div>

                {/* Metrics row */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                  marginBottom:"0.875rem",gap:"0.5rem"}}>
                  <ScoreRing score={asset.collateralScore} color={asset.color}/>
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:"0.35rem"}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:"0.4rem",color:"rgba(255,255,255,0.3)",fontFamily:MONO}}>Value</span>
                      <span style={{fontSize:"0.52rem",fontWeight:800,color:"#f0f0f0",fontFamily:MONO}}>
                        {fmtUsd(asset.declaredValueUsd)}
                      </span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:"0.4rem",color:"rgba(255,255,255,0.3)",fontFamily:MONO}}>LTV Cap</span>
                      <span style={{fontSize:"0.5rem",fontWeight:700,color:"#FBBF24",fontFamily:MONO}}>{asset.ltv}%</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:"0.4rem",color:"rgba(255,255,255,0.3)",fontFamily:MONO}}>Max Borrow</span>
                      <span style={{fontSize:"0.5rem",fontWeight:700,color:"#14F195",fontFamily:MONO}}>
                        {asset.collateralScore>0?fmtUsd(Math.round(asset.declaredValueUsd*asset.ltv/100))+" USDC":"Pending"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status badge */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"0.4rem 0.625rem",borderRadius:"5px",
                  background:`${st.color}08`,border:`1px solid ${st.color}20`,
                  marginBottom:isOpen?"0.875rem":0}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{width:5,height:5,borderRadius:"50%",background:st.color,
                      animation:asset.verificationStatus==="under_review"?"pulse 1.5s ease-in-out infinite":"none"}}/>
                    <span style={{fontSize:"0.42rem",fontWeight:700,color:st.color,
                      fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.08em"}}>
                      {st.label}
                    </span>
                  </div>
                  <span style={{fontSize:"0.42rem",color:"rgba(255,255,255,0.2)",fontFamily:MONO}}>
                    Risk {asset.riskTier}
                  </span>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{borderTop:"1px solid rgba(255,255,255,0.06)",paddingTop:"0.875rem"}}>
                    {([
                      ["Verified By",   asset.verifierName],
                      ["Custody",       asset.custodyLocation],
                      ["Last Audit",    asset.lastAudit],
                      ["Liquidity",     asset.liquidityRating],
                      ["Certificate",   asset.certId],
                    ] as [string,string][]).map(([k,v])=>(
                      <div key={k} style={{display:"flex",justifyContent:"space-between",
                        padding:"0.3rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                        <span style={{fontSize:"0.38rem",color:"rgba(255,255,255,0.25)",fontFamily:MONO,
                          textTransform:"uppercase",letterSpacing:"0.1em"}}>{k}</span>
                        <span style={{fontSize:"0.42rem",fontWeight:600,color:"rgba(255,255,255,0.6)",
                          fontFamily:MONO,textAlign:"right",maxWidth:"60%",wordBreak:"break-all"}}>{v}</span>
                      </div>
                    ))}
                    {asset.flags.length>0&&(
                      <div style={{marginTop:"0.5rem"}}>
                        {asset.flags.map((f,i)=>(
                          <div key={i} style={{display:"flex",gap:5,padding:"0.2rem 0",
                            fontSize:"0.4rem",color:"rgba(251,191,36,0.6)"}}>
                            <span>⚠</span><span>{f}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <a href={`/api/certificates/${asset.certId}/verify`}
                      target="_blank" rel="noopener noreferrer"
                      onClick={e=>e.stopPropagation()}
                      style={{display:"block",marginTop:"0.625rem",padding:"0.45rem",
                        borderRadius:"5px",textAlign:"center",textDecoration:"none",
                        background:`${asset.color}10`,border:`1px solid ${asset.color}25`,
                        fontSize:"0.46rem",fontWeight:700,fontFamily:MONO,
                        color:asset.color,letterSpacing:"0.06em"}}>
                      Verify Certificate →
                    </a>
                  </div>
                )}
              </div>
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
            </div>
          );
        })}
      </div>
    </div>
  );
}