// FILE: components/BorrowPage.tsx
// Borrow tab. Institutional. No fake numbers. Clear CTA.
// Typography sized for readability — not microscopic telemetry.
"use client";

import { useState } from "react";

const ABRA_CA = "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS";
const SWAP_URL = `https://jup.ag/swap/SOL-${ABRA_CA}`;

export function BorrowPage() {
  const [expanded, setExpanded] = useState<number|null>(null);

  const FAQ = [
    {q:"What assets qualify as collateral?",
     a:"Any asset that completes the Abraxas authentication pipeline — including watches, spirits, metals, graded cards, and art. The asset must pass custody validation before borrow eligibility is granted."},
    {q:"How is the loan-to-value ratio determined?",
     a:"LTV is assigned per asset class based on historical market liquidity, volatility, and custody confidence. Metals qualify for up to 80% LTV. Art and racehorses are conservatively set at 45-55%."},
    {q:"What happens if my collateral value drops?",
     a:"If your collateral value falls below the liquidation threshold, Loopscale's risk engine will issue a health warning. You may add collateral or repay part of the loan to restore the health factor."},
    {q:"Is the underlying asset sold during a loan?",
     a:"No. The physical asset remains in custody throughout the loan period. Ownership does not transfer. You retain the on-chain token and can reclaim the asset upon full repayment."},
  ];

  return (
    <div style={{maxWidth:620,margin:"4rem auto",padding:"0 1rem"}}>

      {/* Header */}
      <div style={{marginBottom:"2rem"}}>
        <div style={{fontSize:"0.56rem",color:"rgba(255,255,255,0.25)",
          fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
          letterSpacing:"0.2em",marginBottom:"0.625rem"}}>Capital Access</div>
        <h1 style={{fontWeight:900,fontSize:"clamp(1.4rem,3vw,2rem)",color:"#f0f0f0",
          margin:"0 0 0.875rem",letterSpacing:"-0.03em",lineHeight:1.1}}>
          Borrow Against<br/>
          <span style={{color:"#14F195"}}>Verified Collateral</span>
        </h1>
        <p style={{fontSize:"0.6rem",color:"rgba(255,255,255,0.38)",
          lineHeight:1.75,margin:0}}>
          Verified Abraxas assets unlock USDC liquidity via Loopscale.
          Retain ownership of your physical asset. Access capital immediately.
          No selling required.
        </p>
      </div>

      {/* Protocol spec */}
      <div style={{padding:"1.25rem",background:"rgba(255,255,255,0.02)",
        border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",
        marginBottom:"1.5rem"}}>
        {([
          ["Protocol",       "Loopscale"],
          ["Collateral Type","Abraxas Token-2022 verified positions"],
          ["Settlement",     "USDC on Solana"],
          ["Fixed APR",      "5.2%"],
          ["LTV Range",      "45% to 80% depending on asset class"],
          ["Custody",        "Asset held by verified partner throughout loan period"],
          ["Liquidation",    "Health factor monitored in real time. Alerts issued below threshold."],
        ] as [string,string][]).map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",
            padding:"0.6rem 0",borderBottom:"1px solid rgba(255,255,255,0.05)",
            gap:"1rem",flexWrap:"wrap"}}>
            <span style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.3)",
              fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
              letterSpacing:"0.1em",flexShrink:0}}>{k}</span>
            <span style={{fontSize:"0.52rem",fontWeight:600,
              color:"rgba(255,255,255,0.65)",
              fontFamily:"'JetBrains Mono',monospace",textAlign:"right"}}>{v}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button onClick={()=>window.open("https://app.loopscale.com/vaults","_blank","noopener")}
        style={{width:"100%",padding:"1rem",borderRadius:"7px",
          border:"1px solid rgba(107,140,255,0.4)",cursor:"pointer",
          fontWeight:700,fontSize:"0.72rem",
          fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em",
          background:"rgba(107,140,255,0.08)",color:"#6b8cff",
          marginBottom:"0.75rem",transition:"all 0.15s"}}>
        Open Loopscale App
      </button>
      <div style={{fontSize:"0.46rem",color:"rgba(255,255,255,0.18)",
        textAlign:"center",fontFamily:"'JetBrains Mono',monospace",
        lineHeight:1.6,marginBottom:"2.5rem"}}>
        Connect your wallet on Loopscale to authenticate and execute the borrow.
        Abraxas verified positions are automatically recognized.
      </div>

      {/* Get ABRA */}
      <div style={{padding:"1rem",border:"1px solid rgba(200,169,110,0.15)",
        borderRadius:"8px",background:"rgba(200,169,110,0.03)",marginBottom:"1.5rem"}}>
        <div style={{fontSize:"0.46rem",fontWeight:700,color:"rgba(200,169,110,0.6)",
          fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
          letterSpacing:"0.15em",marginBottom:"0.5rem"}}>Need ABRA to Tokenize?</div>
        <div style={{fontSize:"0.54rem",color:"rgba(255,255,255,0.35)",
          marginBottom:"0.75rem",lineHeight:1.65}}>
          ABRA is required to initiate the tokenization process.
          Acquire through Jupiter.
        </div>
        <a href={SWAP_URL} target="_blank" rel="noopener noreferrer"
          style={{display:"inline-flex",alignItems:"center",gap:"0.5rem",
            padding:"0.5rem 1rem",borderRadius:"5px",textDecoration:"none",
            border:"1px solid rgba(200,169,110,0.25)",
            background:"rgba(200,169,110,0.07)",color:"#C8A96E",
            fontSize:"0.52rem",fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>
          Buy ABRA on Jupiter
        </a>
      </div>

      {/* FAQ */}
      <div style={{border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",
        overflow:"hidden"}}>
        <div style={{padding:"0.75rem 1rem",borderBottom:"1px solid rgba(255,255,255,0.06)",
          fontSize:"0.44rem",fontWeight:700,color:"rgba(255,255,255,0.2)",
          fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
          letterSpacing:"0.15em"}}>Frequently Asked</div>
        {FAQ.map((item,i)=>(
          <div key={i} style={{borderBottom:i<FAQ.length-1?"1px solid rgba(255,255,255,0.04)":"none"}}>
            <button onClick={()=>setExpanded(expanded===i?null:i)}
              style={{width:"100%",padding:"0.75rem 1rem",background:"none",border:"none",
                cursor:"pointer",display:"flex",justifyContent:"space-between",
                alignItems:"center",gap:"0.75rem",textAlign:"left"}}>
              <span style={{fontSize:"0.56rem",fontWeight:700,color:"#f0f0f0",flex:1}}>
                {item.q}
              </span>
              <span style={{fontSize:"0.62rem",color:"rgba(255,255,255,0.3)",flexShrink:0}}>
                {expanded===i?"−":"+"}
              </span>
            </button>
            {expanded===i&&(
              <div style={{padding:"0 1rem 0.875rem",fontSize:"0.54rem",
                color:"rgba(255,255,255,0.4)",lineHeight:1.7}}>
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
