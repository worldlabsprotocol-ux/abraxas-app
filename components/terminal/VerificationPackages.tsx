"use client";
// FILE: components/terminal/VerificationPackages.tsx
// New section, leads the verification-first repositioning. Accredited
// Investor is deliberately NOT a self-serve tier, see the note inline,
// that one has a real Rule 506(c) verification-method requirement.

import { S, M, G, BDR } from "./tokens";
import { MotionCard } from "@/lib/motion/MotionCard";

const PACKAGES = [
  { name:"Social Verification", price:"Free", desc:"LinkedIn, X, GitHub, or Gmail, cryptographically proven", color:G, live:true },
  { name:"Identity Verification", price:"$29", desc:"Government ID + liveness check", color:G, live:true },
  { name:"Business Verification", price:"$199", desc:"KYB review, entity validation, document review", color:"#3B82F6", live:false },
  { name:"Property Verification", price:"$499", desc:"Ownership review, title chain, supporting documentation", color:"#F59E0B", live:false },
  { name:"Royalty Verification", price:"$499", desc:"Publishing review, rights validation, ownership review", color:"#8B5CF6", live:false },
  { name:"Enterprise Asset Verification", price:"Custom", desc:"Real estate, mineral rights, film IP, music catalogs, private businesses", color:G, live:false },
];

export function VerificationPackages() {
  return (
    <div>
      <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:700,
                     color:"var(--text-primary)", marginBottom:"0.375rem" }}>
        Verification Packages
      </div>
      <p style={{ fontFamily:S, fontSize:"0.78rem", color:"var(--text-secondary)",
                   lineHeight:1.65, marginBottom:"1.25rem", maxWidth:560 }}>
        Verification is the product. Tokenization and investing are things
        verification makes possible, not the other way around.
      </p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",
                     gap:"0.75rem" }}>
        {PACKAGES.map(p => (
          <MotionCard key={p.name} glowColor={`${p.color}40`}
            style={{ padding:"0.875rem", borderRadius:10,
                     border:`1px solid ${BDR}`, background:"var(--surface-raised)" }}>
            <div style={{ display:"flex", justifyContent:"space-between",
                           alignItems:"flex-start", marginBottom:"0.4rem" }}>
              <span style={{ fontFamily:S, fontSize:"0.82rem", fontWeight:700,
                              color:"var(--text-primary)" }}>{p.name}</span>
              {!p.live && (
                <span style={{ fontFamily:M, fontSize:"0.5rem", fontWeight:700,
                                color:"var(--text-muted)", background:"var(--surface-raised)",
                                padding:"0.1rem 0.4rem", borderRadius:8 }}>
                  COMING SOON
                </span>
              )}
            </div>
            <div style={{ fontFamily:M, fontSize:"1.1rem", fontWeight:800,
                           color:p.color, marginBottom:"0.3rem" }}>
              {p.price}
            </div>
            <div style={{ fontFamily:S, fontSize:"0.72rem",
                           color:"var(--text-muted)", lineHeight:1.5 }}>
              {p.desc}
            </div>
          </MotionCard>
        ))}
      </div>
      <div style={{ marginTop:"0.875rem", padding:"0.75rem", borderRadius:8,
                     background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)" }}>
        <span style={{ fontFamily:S, fontSize:"0.72rem", color:"var(--text-secondary)", lineHeight:1.6 }}>
          Accredited Investor verification isn&rsquo;t listed as a self-serve tier on purpose.
          SEC Rule 506(c) requires specific verification methods (tax documents or a
          letter from a licensed attorney, CPA, or broker-dealer), it's handled as a
          manual review, the same as the other document-based stamps.
        </span>
      </div>
    </div>
  );
}
