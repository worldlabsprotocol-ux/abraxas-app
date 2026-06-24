"use client";
// FILE: components/terminal/ZkLoginPreview.tsx
// "Coming soon, ZK Login" restored from the original loading page.
// One change from the original copy: it named another protocol by
// name as the comparison point, removed per the standing rule not to
// name-drop other protocols, everything else is the original wording.

import { S, G, W, BDR } from "./tokens";
import { ScrollFade } from "./ui";

export function ZkLoginPreview() {
  return (
    <ScrollFade>
      <div style={{ padding:"1.5rem", borderRadius:14,
                     background:"rgba(16,185,129,0.06)",
                     border:`1px solid ${G}30` }}>
        <div style={{ fontFamily:S, fontSize:"0.68rem", fontWeight:600,
                       color:"#F59E0B", marginBottom:"0.5rem" }}>
          Coming soon, ZK Login
        </div>
        <div style={{ fontFamily:S, fontSize:"clamp(1rem,2.2vw,1.25rem)",
                       fontWeight:700, color:W, marginBottom:"0.75rem" }}>
          Sign in with Google. Wallet created automatically.
        </div>
        <p style={{ fontFamily:S, fontSize:"0.82rem",
                     color:"rgba(21,21,26,0.5)", lineHeight:1.7,
                     maxWidth:560, margin:"0 0 1.25rem" }}>
          No MetaMask. No seed phrases. No crypto knowledge required. Sign
          in with your Google account and Abraxas creates a Solana wallet
          for you silently. The same zero-knowledge login pattern other
          chains have pioneered, coming to Abraxas for every user who
          needs it.
        </p>
        <div style={{ display:"flex", gap:"0.625rem", flexWrap:"wrap",
                       marginBottom:"0.875rem" }}>
          {[
            { icon:"G", label:"Continue with Google" },
            { icon:"A", label:"Continue with Apple" },
            { icon:"W", label:"Connect Wallet" },
          ].map(btn => (
            <div key={btn.label}
              style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                        padding:"0.625rem 1rem", borderRadius:8,
                        border:`1px solid ${BDR}`, opacity:0.5,
                        cursor:"not-allowed" }}>
              <span style={{ width:20, height:20, borderRadius:"50%",
                              background:"rgba(255,255,255,0.1)",
                              display:"flex", alignItems:"center",
                              justifyContent:"center", fontFamily:S,
                              fontSize:"0.65rem", fontWeight:700,
                              color:"rgba(21,21,26,0.5)" }}>
                {btn.icon}
              </span>
              <span style={{ fontFamily:S, fontSize:"0.78rem", fontWeight:600,
                              color:"rgba(21,21,26,0.5)" }}>
                {btn.label}
              </span>
            </div>
          ))}
        </div>
        <div style={{ fontFamily:S, fontSize:"0.62rem",
                       color:"rgba(21,21,26,0.3)", letterSpacing:"0.04em" }}>
          POWERED BY ZK PROOFS, SOLANA MAINNET
        </div>
      </div>
    </ScrollFade>
  );
}
