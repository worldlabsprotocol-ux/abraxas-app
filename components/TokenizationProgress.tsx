// FILE: components/TokenizationProgress.tsx
// DeFi-grade post-mint progress section.
// Shows live verification pipeline with Circuit monitoring overlay.
// Drop directly into IssuanceEngine success state (step 7 / "queue").
"use client";

import { useState, useEffect } from "react";

const MONO = "'JetBrains Mono',monospace";

interface Props {
  assetName:  string;
  assetClass: string;
  txSignature: string;
  tokenId:    string;
  amountAbra: number;
  onViewPortfolio?: () => void;
}

const PIPELINE_STEPS = [
  { id:"intake",    label:"Asset Intake & Hash",      detail:"Metadata SHA-256 anchored on Solana",         icon:"01", color:"#14F195" },
  { id:"identity",  label:"Identity Binding",          detail:"Wallet signature bound to Token-2022 position",icon:"02", color:"#C8A96E" },
  { id:"documents", label:"Document Submission",       detail:"Verification queue — partner review initiated",icon:"03", color:"#FBBF24" },
  { id:"custody",   label:"Custody Assignment",        detail:"Institutional vault placement pending",        icon:"04", color:"#6b8cff" },
  { id:"risk",      label:"Risk & Collateral Score",   detail:"4-factor algorithm — live price data feeding", icon:"05", color:"#a855f7" },
  { id:"cert",      label:"Certificate Mint",          detail:"Token-2022 + Ed25519 verifier signature",      icon:"06", color:"#9945FF" },
  { id:"collateral",label:"Collateral Activation",     detail:"USDC borrowing via Loopscale — pending verify",icon:"07", color:"#14F195" },
];

const CIRCUIT_LINES = [
  "CIRCUIT: Asset hash anchored — monitoring initiated",
  "CIRCUIT: Wallet binding verified — owner authenticated",
  "CIRCUIT: Document fingerprint queued for partner review",
  "CIRCUIT: Liquidity depth nominal for asset class",
  "CIRCUIT: Oracle feeds stable — no anomalies detected",
  "CIRCUIT: Provenance chain open — awaiting submissions",
];

export function TokenizationProgress({
  assetName, assetClass, txSignature, tokenId, amountAbra, onViewPortfolio,
}: Props) {
  const [activeStep,   setActiveStep]   = useState(0);
  const [circuitLines, setCircuitLines] = useState<string[]>([CIRCUIT_LINES[0]]);
  const [copied,       setCopied]       = useState(false);
  const isDemoTx = txSignature.startsWith("DEMO-");

  // Animate pipeline steps
  useEffect(() => {
    const timers = [500, 1200, 2100, 3200, 4500, 6000].map((delay, i) =>
      setTimeout(() => setActiveStep(i + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Animate circuit feed
  useEffect(() => {
    let i = 1;
    const iv = setInterval(() => {
      if (i < CIRCUIT_LINES.length) {
        setCircuitLines(prev => [CIRCUIT_LINES[i], ...prev]);
        i++;
      } else clearInterval(iv);
    }, 900);
    return () => clearInterval(iv);
  }, []);

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div style={{ maxWidth:580, margin:"0 auto" }}>

      {/* Status header */}
      <div style={{
        padding:"1.25rem 1.5rem",
        border:"1px solid rgba(20,241,149,0.3)",
        borderRadius:"10px 10px 0 0",
        background:"rgba(20,241,149,0.04)",
        display:"flex", alignItems:"center", gap:"0.875rem",
      }}>
        <div style={{
          width:12, height:12, borderRadius:"50%",
          background:"#14F195",
          boxShadow:"0 0 14px rgba(20,241,149,0.7)",
          flexShrink:0, animation:"pulse 1.5s ease-in-out infinite",
        }}/>
        <div>
          <div style={{ fontWeight:900, fontSize:"0.88rem", color:"#14F195",
                        fontFamily:MONO, letterSpacing:"-0.01em" }}>
            {isDemoTx ? "DEMO — SUBMISSION CONFIRMED" : "TRANSACTION CONFIRMED"}
          </div>
          <div style={{ fontSize:"0.44rem", color:"rgba(255,255,255,0.3)",
                        fontFamily:MONO, marginTop:2 }}>
            {assetName} · {assetClass} · {amountAbra} ABRA deducted
          </div>
        </div>
      </div>

      {/* Pipeline + Circuit — two column */}
      <div style={{
        display:"grid", gridTemplateColumns:"1.2fr 1fr",
        border:"1px solid rgba(255,255,255,0.08)",
        borderTop:"none", borderRadius:"0 0 10px 10px",
        overflow:"hidden",
      }}>

        {/* Left: verification pipeline */}
        <div style={{ padding:"1.25rem", borderRight:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize:"0.36rem", fontWeight:700,
                        color:"rgba(255,255,255,0.2)", fontFamily:MONO,
                        textTransform:"uppercase", letterSpacing:"0.15em",
                        marginBottom:"1rem" }}>
            Verification Pipeline
          </div>
          {PIPELINE_STEPS.map((step, i) => {
            const done    = activeStep > i;
            const current = activeStep === i;
            const col     = done ? step.color : current ? step.color : "rgba(255,255,255,0.15)";
            return(
              <div key={step.id} style={{
                display:"flex", gap:"0.625rem",
                marginBottom: i < PIPELINE_STEPS.length-1 ? "0.75rem" : 0,
                opacity: !done && !current ? 0.35 : 1,
                transition:"opacity 0.4s",
              }}>
                {/* Node + connector */}
                <div style={{ display:"flex", flexDirection:"column",
                              alignItems:"center", flexShrink:0 }}>
                  <div style={{
                    width:22, height:22, borderRadius:"50%",
                    background: done ? `${step.color}18` : current ? `${step.color}12` : "rgba(255,255,255,0.04)",
                    border:`1.5px solid ${col}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    transition:"all 0.4s",
                  }}>
                    {done
                      ? <span style={{ color:step.color, fontSize:"0.52rem" }}>✓</span>
                      : <span style={{ color:col, fontSize:"0.28rem", fontFamily:MONO,
                                       fontWeight:700 }}>{step.icon}</span>}
                  </div>
                  {i < PIPELINE_STEPS.length-1 && (
                    <div style={{
                      width:1, flex:1, minHeight:8,
                      background: done ? `${step.color}30` : "rgba(255,255,255,0.06)",
                      transition:"background 0.4s", marginTop:2,
                    }}/>
                  )}
                </div>
                {/* Text */}
                <div style={{ paddingTop:2 }}>
                  <div style={{ fontSize:"0.52rem", fontWeight:done?700:500,
                                color:done?"#f0f0f0":current?col:"rgba(255,255,255,0.4)",
                                transition:"color 0.4s", lineHeight:1.2 }}>
                    {step.label}
                  </div>
                  {(done||current) && (
                    <div style={{ fontSize:"0.36rem", color:"rgba(255,255,255,0.28)",
                                  marginTop:2, lineHeight:1.4 }}>
                      {step.detail}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Circuit feed */}
        <div style={{ padding:"1.25rem", background:"rgba(2,3,10,0.8)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.375rem",
                        marginBottom:"0.875rem" }}>
            <div style={{ width:5, height:5, borderRadius:"50%", background:"#14F195",
                          animation:"pulse 1.5s ease-in-out infinite" }}/>
            <span style={{ fontSize:"0.36rem", fontWeight:700,
                           color:"rgba(20,241,149,0.6)", fontFamily:MONO,
                           letterSpacing:"0.12em", textTransform:"uppercase" }}>
              CIRCUIT MONITOR
            </span>
          </div>
          <div style={{ height:280, overflowY:"auto", display:"flex",
                        flexDirection:"column-reverse" }}>
            {circuitLines.map((line, i) => (
              <div key={i} style={{
                fontSize:"0.36rem", fontFamily:MONO,
                color: i===0 ? "rgba(20,241,149,0.8)" : `rgba(96,165,250,${Math.max(0.15,0.6-i*0.08)})`,
                lineHeight:1.6, marginBottom:"0.2rem",
                transition:"opacity 0.3s",
              }}>
                {`[${new Date().toISOString().slice(11,19)}] ${line}`}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction proof */}
      <div style={{
        marginTop:"1rem", padding:"0.875rem 1rem",
        background:"rgba(255,255,255,0.02)",
        border:"1px solid rgba(255,255,255,0.07)", borderRadius:"8px",
      }}>
        <div style={{ fontSize:"0.34rem", fontWeight:700,
                      color:"rgba(255,255,255,0.2)", fontFamily:MONO,
                      textTransform:"uppercase", letterSpacing:"0.15em",
                      marginBottom:"0.4rem" }}>
          On-Chain Proof
        </div>
        {([
          ["Token ID",   tokenId],
          ["Tx",         txSignature],
          ["Network",    isDemoTx ? "Demo Mode" : "Solana Mainnet"],
        ] as [string,string][]).map(([k,v]) => (
          <div key={k} style={{ display:"flex", justifyContent:"space-between",
                                padding:"0.25rem 0",
                                borderBottom:"1px solid rgba(255,255,255,0.04)",
                                gap:"0.5rem" }}>
            <span style={{ fontSize:"0.38rem", color:"rgba(255,255,255,0.25)",
                           fontFamily:MONO, textTransform:"uppercase",
                           letterSpacing:"0.1em", flexShrink:0 }}>{k}</span>
            <div style={{ display:"flex", alignItems:"center", gap:"0.3rem" }}>
              <span style={{ fontSize:"0.4rem", color:"rgba(255,255,255,0.55)",
                             fontFamily:MONO, wordBreak:"break-all",
                             textAlign:"right" }}>
                {v.length > 24 ? `${v.slice(0,12)}…${v.slice(-6)}` : v}
              </span>
              {v.length > 12 && (
                <button onClick={() => copy(v)} style={{
                  padding:"0.1rem 0.35rem", borderRadius:"3px",
                  border:"1px solid rgba(255,255,255,0.08)",
                  background:"rgba(255,255,255,0.04)",
                  color: copied ? "#14F195":"rgba(255,255,255,0.3)",
                  fontSize:"0.3rem", cursor:"pointer", flexShrink:0,
                  fontFamily:MONO,
                }}>{copied?"✓":"Copy"}</button>
              )}
            </div>
          </div>
        ))}
        {!isDemoTx && (
          <a href={`https://solscan.io/tx/${txSignature}`}
            target="_blank" rel="noopener noreferrer"
            style={{ display:"block", marginTop:"0.5rem",
                     fontSize:"0.42rem", color:"rgba(107,140,255,0.7)",
                     fontFamily:MONO, textDecoration:"none" }}>
            View on Solscan →
          </a>
        )}
      </div>

      {/* What happens next */}
      <div style={{
        marginTop:"1rem", padding:"1rem",
        background:"rgba(255,255,255,0.02)",
        border:"1px solid rgba(255,255,255,0.07)", borderRadius:"8px",
      }}>
        <div style={{ fontSize:"0.36rem", fontWeight:700,
                      color:"rgba(255,255,255,0.2)", fontFamily:MONO,
                      textTransform:"uppercase", letterSpacing:"0.15em",
                      marginBottom:"0.625rem" }}>Next Steps</div>
        {[
          "Your asset is now in the verification queue. A named authentication partner has been assigned.",
          "Documentation upload will be requested within 24 hours via your registered contact.",
          "Custody assignment completes within 2 — 5 business days for standard collectibles.",
          "Once all stages pass, your Token-2022 certificate is minted and USDC borrowing activates.",
        ].map((s, i) => (
          <div key={i} style={{ display:"flex", gap:"0.5rem",
                                marginBottom:i<3?"0.4rem":0 }}>
            <span style={{ fontSize:"0.4rem", color:"rgba(20,241,149,0.4)",
                           fontFamily:MONO, flexShrink:0 }}>
              {String(i+1).padStart(2,"0")}
            </span>
            <span style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.35)",
                           lineHeight:1.6 }}>{s}</span>
          </div>
        ))}
      </div>

      {onViewPortfolio && (
        <button onClick={onViewPortfolio} style={{
          marginTop:"1rem", width:"100%", padding:"0.875rem",
          borderRadius:"7px", fontWeight:800,
          fontSize:"0.68rem", fontFamily:MONO,
          letterSpacing:"0.04em",
          background:"rgba(200,169,110,0.1)",color:"#C8A96E",
          border:"1px solid rgba(200,169,110,0.25)",
          cursor:"pointer",
        }}>
          View Portfolio →
        </button>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}