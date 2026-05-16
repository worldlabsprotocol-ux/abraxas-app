// FILE: components/TransactionReceipt.tsx
// Post-mint transaction receipt. Shows on-chain confirmation.
// Explorer link. ABRA deducted. Verification pipeline initiated.
"use client";

import { useState, useEffect } from "react";

const EXPLORER = "https://solscan.io/tx";

interface Props {
  txSignature:   string;
  amountAbra:    number;
  assetName:     string;
  assetClass:    string;
  tokenId:       string;
  onContinue?:   () => void;
}

export function TransactionReceipt({
  txSignature, amountAbra, assetName, assetClass, tokenId, onContinue,
}: Props) {
  const [copied, setCopied]     = useState(false);
  const [elapsed, setElapsed]   = useState(0);
  const isDemoTx = txSignature.startsWith("DEMO-");

  useEffect(() => {
    const iv = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div style={{
      padding:"1.5rem", border:"1px solid rgba(20,241,149,0.25)",
      borderRadius:"10px", background:"rgba(20,241,149,0.03)",
    }}>
      {/* Status */}
      <div style={{ display:"flex", alignItems:"center", gap:"0.625rem",
                    marginBottom:"1.25rem" }}>
        <div style={{ width:10, height:10, borderRadius:"50%", background:"#14F195",
                      boxShadow:"0 0 12px rgba(20,241,149,0.6)", flexShrink:0 }}/>
        <div>
          <div style={{ fontWeight:900, fontSize:"0.78rem", color:"#14F195",
                        fontFamily:"'JetBrains Mono',monospace" }}>
            {isDemoTx ? "DEMO CONFIRMED" : "TRANSACTION CONFIRMED"}
          </div>
          <div style={{ fontSize:"0.42rem", color:"rgba(255,255,255,0.3)",
                        fontFamily:"'JetBrains Mono',monospace" }}>
            Verification pipeline initiated · {elapsed}s ago
          </div>
        </div>
      </div>

      {/* Receipt lines */}
      <div style={{ display:"flex", flexDirection:"column", gap:"0", marginBottom:"1.25rem",
                    border:"1px solid rgba(255,255,255,0.06)", borderRadius:"7px",
                    overflow:"hidden" }}>
        {([
          ["Asset",         assetName],
          ["Class",         assetClass],
          ["Token ID",      tokenId],
          ["ABRA Deducted", `${amountAbra.toLocaleString()} $ABRA`],
          ["Status",        "Created — Pending Documents"],
          ["Network",       isDemoTx ? "Demo Mode" : "Solana Mainnet"],
        ] as [string,string][]).map(([k,v]) => (
          <div key={k} style={{ display:"flex", justifyContent:"space-between",
                                padding:"0.6rem 0.875rem", gap:"1rem",
                                borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize:"0.44rem", color:"rgba(255,255,255,0.3)",
                           fontFamily:"'JetBrains Mono',monospace",
                           textTransform:"uppercase", letterSpacing:"0.1em",
                           flexShrink:0 }}>{k}</span>
            <span style={{ fontSize:"0.46rem", fontWeight:600,
                           color:"rgba(255,255,255,0.65)",
                           fontFamily:"'JetBrains Mono',monospace",
                           textAlign:"right", wordBreak:"break-all" }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Transaction hash */}
      <div style={{ padding:"0.75rem 0.875rem", background:"rgba(255,255,255,0.02)",
                    border:"1px solid rgba(255,255,255,0.06)", borderRadius:"6px",
                    marginBottom:"1.25rem" }}>
        <div style={{ fontSize:"0.38rem", fontWeight:700, color:"rgba(255,255,255,0.2)",
                      fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase",
                      letterSpacing:"0.15em", marginBottom:"0.35rem" }}>
          Transaction Signature
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
          <code style={{ fontSize:"0.44rem", color:"rgba(255,255,255,0.5)",
                         fontFamily:"'JetBrains Mono',monospace", flex:1,
                         wordBreak:"break-all" }}>
            {txSignature}
          </code>
          <button onClick={() => copy(txSignature)} style={{
            padding:"0.2rem 0.5rem", borderRadius:"3px", cursor:"pointer",
            border:"1px solid rgba(255,255,255,0.1)",
            background:"rgba(255,255,255,0.04)",
            color: copied ? "#14F195" : "rgba(255,255,255,0.35)",
            fontSize:"0.38rem", fontFamily:"'JetBrains Mono',monospace",
            flexShrink:0, transition:"color 0.2s",
          }}>{copied ? "Copied" : "Copy"}</button>
        </div>
      </div>

      {/* Explorer link */}
      {!isDemoTx && (
        <a href={`${EXPLORER}/${txSignature}`} target="_blank" rel="noopener noreferrer"
          style={{ display:"block", textAlign:"center", padding:"0.5rem",
                   fontSize:"0.46rem", color:"rgba(107,140,255,0.7)",
                   fontFamily:"'JetBrains Mono',monospace",
                   textDecoration:"none", marginBottom:"1rem" }}>
          View on Solscan
        </a>
      )}

      {/* Next steps */}
      <div style={{ padding:"0.875rem", background:"rgba(255,255,255,0.02)",
                    border:"1px solid rgba(255,255,255,0.05)", borderRadius:"6px",
                    marginBottom:"1.25rem" }}>
        <div style={{ fontSize:"0.42rem", fontWeight:700, color:"rgba(255,255,255,0.35)",
                      fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase",
                      letterSpacing:"0.12em", marginBottom:"0.5rem" }}>
          Next Steps
        </div>
        {([
          "Your asset is now in the Abraxas verification queue.",
          "Documentation upload will be requested via your registered contact.",
          "Custody validation typically completes within 2 to 5 business days.",
          "Once verified, borrow eligibility is activated automatically.",
        ]).map((s,i) => (
          <div key={i} style={{ display:"flex", gap:"0.5rem",
                                marginBottom:i<3?"0.35rem":0 }}>
            <span style={{ fontSize:"0.42rem", color:"rgba(20,241,149,0.4)",
                           fontFamily:"'JetBrains Mono',monospace",
                           flexShrink:0 }}>{String(i+1).padStart(2,"0")}</span>
            <span style={{ fontSize:"0.48rem", color:"rgba(255,255,255,0.35)",
                           lineHeight:1.55 }}>{s}</span>
          </div>
        ))}
      </div>

      {onContinue && (
        <button onClick={onContinue} style={{
          width:"100%", padding:"0.75rem", borderRadius:"6px", border:"none",
          cursor:"pointer", fontWeight:700, fontSize:"0.6rem",
          fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.04em",
          background:"rgba(200,169,110,0.12)", color:"#C8A96E",
          border:"1px solid rgba(200,169,110,0.25)" as any,
        }}>
          View Portfolio
        </button>
      )}
    </div>
  );
}