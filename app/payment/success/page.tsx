// FILE: app/payment/success/page.tsx
// Post-payment success page. shows confirmation, next steps.
"use client";

import { useEffect, useState } from "react";
import { useSearchParams }     from "next/navigation";
import Link                    from "next/link";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S = "system-ui,-apple-system,sans-serif";
const G = "#10B981";
const W = "#F8FAFC";
const BDR = "#1C2333";

const NEXT_STEPS: Record<string, string[]> = {
  wyoming_starter:    ["Review your Operating Agreement draft (24-48h)","Confirm entity name + registered agent","Token minted after LLC is filed","V5 verification begins automatically"],
  wyoming_growth:     ["Review your Operating Agreement draft (24-48h)","Multi-sig governance setup scheduled","Cap table configuration call booked","Lending eligibility assigned on completion"],
  wyoming_enterprise: ["Dedicated verifier assigned within 2 hours","Compliance package delivered within 48h","Priority processing. all stages expedited","Direct line to verification team"],
  asset_verification: ["Documentation review begins within 24h","Assigned verifier contacts you by email","V5 pipeline stages: Identity → Ownership → Legal → Audit","W3C credential issued on completion"],
  music_audit:        ["ISRC/ISWC gap analysis begins within 48h","MLC registration status reviewed","Royalty gap report delivered within 5 business days","Tokenization path recommended in report"],
};

export default function PaymentSuccessPage() {
  const params  = useSearchParams();
  const product = params.get("product") ?? "wyoming_starter";
  const steps   = NEXT_STEPS[product] ?? NEXT_STEPS["wyoming_starter"]!;

  const productLabel =
    product === "wyoming_starter"    ? "Wyoming LLC. Starter"
    : product === "wyoming_growth"   ? "Wyoming LLC. Growth"
    : product === "wyoming_enterprise" ? "Wyoming LLC. Enterprise"
    : product === "asset_verification" ? "Asset Verification. V5"
    : product === "music_audit"      ? "Music Royalty Audit"
    : "Abraxas Protocol";

  return (
    <div style={{ background:"#060810", minHeight:"100vh", fontFamily:M,
                   display:"flex", alignItems:"center", justifyContent:"center",
                   padding:"2rem 1rem" }}>
      <div style={{ maxWidth:540, width:"100%" }}>
        {/* Checkmark */}
        <div style={{ textAlign:"center", marginBottom:"2rem" }}>
          <div style={{ width:64, height:64, borderRadius:"50%",
                         background:`${G}15`, border:`2px solid ${G}`,
                         display:"flex", alignItems:"center", justifyContent:"center",
                         margin:"0 auto 1rem",
                         boxShadow:`0 0 24px ${G}40` }}>
            <span style={{ fontFamily:M, fontSize:"1.5rem", color:G }}>✓</span>
          </div>
          <div style={{ fontFamily:"Georgia,serif",
                         fontSize:"clamp(1.5rem,4vw,2rem)",
                         fontWeight:700, color:W, marginBottom:"0.375rem" }}>
            Payment confirmed.
          </div>
          <div style={{ fontFamily:S, fontSize:"0.85rem",
                         color:"rgba(255,255,255,0.4)" }}>
            {productLabel}
          </div>
        </div>

        {/* Next steps */}
        <div style={{ background:"#0D1117", border:`1px solid ${BDR}`,
                       borderRadius:8, padding:"1.25rem",
                       marginBottom:"1.25rem" }}>
          <div style={{ fontFamily:M, fontSize:"0.58rem", fontWeight:700,
                         color:G, letterSpacing:"0.15em",
                         textTransform:"uppercase", marginBottom:"0.875rem" }}>
            WHAT HAPPENS NEXT
          </div>
          <ol style={{ margin:0, paddingLeft:"1.125rem",
                        display:"flex", flexDirection:"column", gap:"0.625rem" }}>
            {steps.map((step, i) => (
              <li key={i} style={{ fontFamily:S, fontSize:"0.78rem",
                                    color:"rgba(255,255,255,0.55)", lineHeight:1.6 }}>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div style={{ display:"flex", gap:"0.625rem", flexWrap:"wrap" }}>
          <Link href="/dashboard" style={{ flex:1, display:"block",
              padding:"0.75rem", borderRadius:5, border:"none",
              background:G, color:"#000", fontFamily:M, fontSize:"0.78rem",
              fontWeight:900, textDecoration:"none", textAlign:"center",
              letterSpacing:"0.05em", textTransform:"uppercase" }}>
            VIEW DASHBOARD →
          </Link>
          <Link href="/terminal" style={{ flex:1, display:"block",
              padding:"0.75rem", borderRadius:5,
              border:`1px solid ${BDR}`, background:"transparent",
              color:"rgba(255,255,255,0.4)", fontFamily:M, fontSize:"0.75rem",
              fontWeight:700, textDecoration:"none", textAlign:"center",
              letterSpacing:"0.06em", textTransform:"uppercase" }}>
            BACK TO TERMINAL
          </Link>
        </div>
      </div>
    </div>
  );
}
