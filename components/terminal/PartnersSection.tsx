"use client";
// FILE: components/terminal/PartnersSection.tsx

import { BecomeAPartner } from "@/components/BecomeAPartner";
import { M, S, G, B, W, BDR, CARD } from "./tokens";
import { Label, Button, ScrollFade } from "./ui";

export function PartnersSection() {
  return (
    <div style={{ marginBottom:"1.5rem" }}>
      <ScrollFade>
      <Label>Verification Partners</Label>
      <div style={{ padding:"1rem 1.125rem", background:CARD,
                     border:`1px solid ${BDR}`, borderRadius:8,
                     marginBottom:"1.5rem" }}>
        {/* Utilia custody partnership badge */}
        <div style={{ padding:"0.625rem 0.875rem", borderRadius:6,
                       background:"rgba(59,130,246,0.07)",
                       border:"1px solid rgba(59,130,246,0.25)",
                       display:"flex", alignItems:"center",
                       gap:"0.75rem", flexWrap:"wrap",
                       marginBottom:"0.875rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
            <div style={{ width:8, height:8, borderRadius:"50%",
                           background:B, boxShadow:`0 0 5px ${B}` }} />
            <span style={{ fontFamily:M, fontSize:"0.6rem", fontWeight:700,
                            color:B, letterSpacing:"0.12em",
                            textTransform:"uppercase" }}>
              CUSTODY PARTNER · UTILIA
            </span>
          </div>
          <span style={{ fontFamily:S, fontSize:"0.7rem",
                          color:"rgba(255,255,255,0.4)", lineHeight:1.5 }}>
            Institutional MPC custody for assets verified on Abraxas.
            Policy-grade key management beyond Phantom or MetaMask.
          </span>
          <Button href="https://utila.io" variant="outline" color={B} size="sm">
            UTILA.IO
          </Button>
        </div>
        <div style={{ display:"flex", alignItems:"flex-start",
                       justifyContent:"space-between",
                       flexWrap:"wrap", gap:"0.75rem" }}>
          <div>
            <div style={{ fontFamily:S, fontSize:"clamp(0.92rem,2vw,1.15rem)",
                           fontWeight:800, color:W, marginBottom:"0.25rem" }}>
              Join the verification network.
            </div>
            <p style={{ fontFamily:S, fontSize:"0.75rem",
                         color:"rgba(255,255,255,0.45)", lineHeight:1.65,
                         maxWidth:520, margin:0 }}>
              Abraxas partners are the trusted professionals behind every verified asset,
              appraisers, attorneys, title companies, and auditors who validate the
              claims that make on-chain collateral real.
            </p>
          </div>
          <BecomeAPartner />
        </div>
      </div>
      </ScrollFade>
    </div>
  );
}
