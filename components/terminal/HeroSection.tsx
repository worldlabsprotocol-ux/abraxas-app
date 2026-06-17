"use client";
// FILE: components/terminal/HeroSection.tsx
// Protocol headline, stats pills, and Abraxas Passport.

import { AbraxasPassport } from "@/components/identity/AbraxasPassport";
import { M, S, G, W, BDR } from "./tokens";
import { ScrollFade } from "./ui";

interface HeroSectionProps {
  onGetVerified: () => void;
}

const STATS: Array<{ label: string; highlight: boolean }> = [
  { label: "\u25cf 4 ASSETS VERIFIED",      highlight: true  },
  { label: "$2.8M+ ATTESTED",              highlight: false },
  { label: "W3C VC \u00b7 SOLANA MAINNET", highlight: false },
];

export function HeroSection({ onGetVerified }: HeroSectionProps) {
  return (
    <div>
      {/* Headline */}
      <div style={{ marginBottom:"1.5rem", paddingBottom:"1.5rem",
                     borderBottom:`1px solid ${BDR}` }}>
        <div style={{ fontFamily:M, fontSize:"0.6rem", fontWeight:700, color:G,
                       letterSpacing:"0.2em", textTransform:"uppercase",
                       marginBottom:"0.625rem" }}>
          ABRAXAS PROTOCOL · SOLANA MAINNET · BUILD 2026.1
        </div>
        <h1 style={{ fontFamily:"Georgia,'Times New Roman',serif",
                      fontSize:"clamp(1.6rem,4.5vw,3rem)", fontWeight:700,
                      color:W, lineHeight:1.1, letterSpacing:"-0.02em",
                      margin:"0 0 0.75rem" }}>
          The verification and
          <br />
          <span style={{ color:G }}>identity layer</span> for
          <br />
          real-world assets onchain.
        </h1>
        <p style={{ fontFamily:S, fontSize:"clamp(0.82rem,1.8vw,0.95rem)",
                     color:"rgba(255,255,255,0.5)", lineHeight:1.75,
                     maxWidth:540, margin:"0 0 1.25rem" }}>
          Verify your identity and assets once on Abraxas.
          Receive a portable credential every integrated protocol accepts.
          No re-KYC. One passport. Every lender, marketplace, and payment rail.
        </p>
        <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap",
                       alignItems:"center" }}>
          {STATS.map(s => (
            <div key={s.label}
              style={{ padding:"0.35rem 0.75rem", borderRadius:4,
                        background: s.highlight ? `${G}12` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${s.highlight ? G + "30" : BDR}`,
                        fontFamily:M, fontSize:"0.6rem", fontWeight:700,
                        color: s.highlight ? G : "rgba(255,255,255,0.4)",
                        letterSpacing:"0.08em" }}>
              {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Abraxas Passport */}
      <ScrollFade>
      <div style={{ marginBottom:"1.75rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                       marginBottom:"0.875rem" }}>
          <div style={{ width:3, height:18, background:G, borderRadius:2,
                         boxShadow:`0 0 6px ${G}60` }} />
          <span style={{ fontFamily:M, fontSize:"clamp(0.78rem,1.8vw,0.92rem)",
                          fontWeight:800, color:G, letterSpacing:"0.16em",
                          textTransform:"uppercase" }}>
            ABRAXAS PASSPORT
          </span>
          <span style={{ fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                          color:G, background:`${G}15`, border:`1px solid ${G}30`,
                          borderRadius:3, padding:"1px 7px",
                          letterSpacing:"0.08em", textTransform:"uppercase" }}>
            VERIFY ONCE · USE EVERYWHERE
          </span>
        </div>
        <AbraxasPassport
          onGetVerified={onGetVerified}
          earnedStamps={["identity", "compliance"]}
        />
      </div>
      </ScrollFade>
    </div>
  );
}
