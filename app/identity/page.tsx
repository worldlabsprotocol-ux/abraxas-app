// FILE: app/identity/page.tsx
// Dedicated Abraxas Identity page — no more 404 on /identity
// Explains the protocol identity layer, shows verification flow, CTAs.
"use client";

import Link from "next/link";
import { AbraxasPassport } from "@/components/identity/AbraxasPassport";

const M   = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S   = "system-ui,-apple-system,sans-serif";
const G   = "#10B981";
const A   = "#F59E0B";
const B   = "#3B82F6";
const W   = "#F8FAFC";
const BDR = "#1C2333";
const BG  = "#060810";

export default function IdentityPage() {
  return (
    <div style={{ background:BG, minHeight:"100vh", fontFamily:M, color:W }}>
      {/* Nav */}
      <nav style={{ position:"sticky", top:0, zIndex:100,
                     background:"rgba(6,8,16,0.97)", backdropFilter:"blur(12px)",
                     borderBottom:`1px solid ${BDR}`,
                     display:"flex", alignItems:"center",
                     padding:"0 clamp(0.875rem,2vw,1.5rem)",
                     height:52, gap:"0.75rem" }}>
        <Link href="/terminal" style={{ fontFamily:M, fontSize:"0.62rem",
                                         fontWeight:700, color:G,
                                         textDecoration:"none", letterSpacing:"0.1em",
                                         textTransform:"uppercase" }}>
          ← BACK TO TERMINAL
        </Link>
        <div style={{ flex:1 }}/>
        <Link href="/dashboard" style={{ fontFamily:M, fontSize:"0.62rem",
                                          fontWeight:700, color:"rgba(255,255,255,0.35)",
                                          textDecoration:"none", letterSpacing:"0.1em",
                                          textTransform:"uppercase" }}>
          DASHBOARD
        </Link>
      </nav>

      <div style={{ maxWidth:820, margin:"0 auto",
                     padding:"2rem clamp(1rem,3vw,2rem)" }}>
        {/* Header */}
        <div style={{ marginBottom:"2rem" }}>
          <div style={{ fontFamily:M, fontSize:"0.6rem", fontWeight:700, color:G,
                         letterSpacing:"0.2em", textTransform:"uppercase",
                         marginBottom:"0.625rem" }}>
            ABRAXAS IDENTITY LAYER
          </div>
          <h1 style={{ fontFamily:"Georgia,serif",
                        fontSize:"clamp(2rem,5vw,3.5rem)",
                        fontWeight:700, color:W, lineHeight:1.1,
                        letterSpacing:"-0.02em", margin:"0 0 0.875rem" }}>
            One identity.<br/>
            <span style={{ color:G }}>Every protocol.</span>
          </h1>
          <p style={{ fontFamily:S, fontSize:"clamp(0.85rem,1.8vw,1rem)",
                       color:"rgba(255,255,255,0.5)", lineHeight:1.75,
                       maxWidth:560, margin:0 }}>
            Abraxas ID is the universal KYC/KYB layer for real-world assets onchain.
            Verify once. Receive a W3C Verifiable Credential. Present it everywhere —
            no re-KYC, no repeated uploads, no friction tax on every new integration.
          </p>
        </div>

        {/* Live passport */}
        <AbraxasPassport onGetVerified={() => window.location.href = "/terminal#abraxas-id"} />

        {/* Architecture grid */}
        <div style={{ marginTop:"2.5rem" }}>
          <div style={{ fontFamily:M, fontSize:"0.6rem", fontWeight:700, color:G,
                         letterSpacing:"0.16em", textTransform:"uppercase",
                         marginBottom:"1.25rem" }}>
            IDENTITY ARCHITECTURE
          </div>
          <div style={{ display:"grid",
                         gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",
                         gap:"0.75rem" }}>
            {[
              { title:"KYC — Know Your Customer",    color:G,
                points:["Government-issued ID verification","Liveness detection","Sanctions / PEP screening","Address verification"] },
              { title:"KYB — Know Your Business",    color:B,
                points:["Entity existence check","Beneficial owner mapping","Wyoming LLC confirmation","Operating agreement validation"] },
              { title:"Asset Owner Profile",          color:A,
                points:["Ownership claim attestation","Title chain verification","Custody confirmation","Collateral eligibility scoring"] },
              { title:"Credential Portability",       color:"#8B5CF6",
                points:["W3C VC Data Model v2.0","Ed25519 signed by Abraxas","Verifiable by any protocol","Non-transferable, non-forgeable"] },
            ].map(c => (
              <div key={c.title} style={{ background:"#0D1117",
                                           border:`1px solid ${BDR}`,
                                           borderTop:`2px solid ${c.color}`,
                                           borderRadius:7, padding:"1rem" }}>
                <div style={{ fontFamily:S, fontSize:"0.85rem", fontWeight:700,
                               color:W, marginBottom:"0.625rem" }}>{c.title}</div>
                {c.points.map(p => (
                  <div key={p} style={{ display:"flex", gap:"0.4rem",
                                         alignItems:"flex-start", marginBottom:3 }}>
                    <span style={{ color:c.color, fontSize:"0.6rem", marginTop:2 }}>◉</span>
                    <span style={{ fontFamily:S, fontSize:"0.72rem",
                                    color:"rgba(255,255,255,0.45)", lineHeight:1.5 }}>{p}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Privacy note */}
        <div style={{ marginTop:"1.5rem", padding:"1rem 1.125rem", borderRadius:7,
                       background:"rgba(59,130,246,0.06)",
                       border:"1px solid rgba(59,130,246,0.2)" }}>
          <div style={{ fontFamily:M, fontSize:"0.58rem", color:B,
                         letterSpacing:"0.14em", textTransform:"uppercase",
                         marginBottom:"0.5rem" }}>
            PRIVACY-FIRST ARCHITECTURE
          </div>
          <p style={{ fontFamily:S, fontSize:"0.75rem",
                       color:"rgba(255,255,255,0.45)", lineHeight:1.7, margin:0 }}>
            Abraxas never exposes raw documents or sensitive personal data publicly.
            The blockchain stores <strong style={{ color:W }}>verification proofs and attestations</strong>,
            not personal records. Your government ID, biometrics, and sensitive documents
            remain with the certified identity provider (Veriff). Abraxas issues a
            cryptographic proof that you passed — nothing more.
          </p>
        </div>

        {/* CTA */}
        <div style={{ marginTop:"2rem", display:"flex", gap:"0.75rem",
                       flexWrap:"wrap" }}>
          <Link href="/terminal" style={{ padding:"0.75rem 1.5rem", borderRadius:6,
              border:"none", background:G, color:"#000", fontFamily:M,
              fontSize:"0.82rem", fontWeight:900, textDecoration:"none",
              letterSpacing:"0.05em", textTransform:"uppercase",
              boxShadow:`0 0 16px ${G}40` }}>
            START VERIFICATION →
          </Link>
          <Link href="/dashboard" style={{ padding:"0.75rem 1.25rem", borderRadius:6,
              border:`1px solid ${BDR}`, background:"transparent",
              color:"rgba(255,255,255,0.4)", fontFamily:M, fontSize:"0.78rem",
              fontWeight:700, textDecoration:"none", letterSpacing:"0.06em",
              textTransform:"uppercase" }}>
            VIEW DASHBOARD
          </Link>
        </div>
      </div>
    </div>
  );
}
