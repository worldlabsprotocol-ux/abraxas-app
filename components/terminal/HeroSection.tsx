"use client";
// FILE: components/terminal/HeroSection.tsx
// Split into two exported pieces so AssetGrid can sit between them:
// HeroIntro (headline + stats) -> AssetGrid -> HeroPassportTeaser.
// This is intentional layout order, not an accident, the verified
// assets need to be the thing right under the proof stats, before the
// passport pitch.

import { AbraxasPassport } from "@/components/identity/AbraxasPassport";
import { M, S, G, W, BDR, softShadow } from "./tokens";
import { ScrollFade } from "./ui";

const STATS: Array<{ label: string; value: string }> = [
  { label: "Verified assets",  value: "4" },
  { label: "Value attested",   value: "$2.8M+" },
  { label: "Credential standard", value: "W3C" },
];

export function HeroIntro() {
  return (
    <div style={{ marginBottom:"1.5rem", paddingBottom:"1.5rem",
                   borderBottom:`1px solid ${BDR}` }}>
      <div style={{ fontFamily:S, fontSize:"0.78rem", fontWeight:600, color:G,
                     marginBottom:"0.75rem" }}>
        Abraxas
      </div>
      <h1 style={{ fontFamily:S,
                    fontSize:"clamp(1.7rem,4.2vw,2.75rem)", fontWeight:700,
                    color:"var(--text-primary)", lineHeight:1.15, letterSpacing:"-0.02em",
                    margin:"0 0 0.875rem" }}>
        Turn real-world assets into
        <br />
        verifiable, investable capital.
      </h1>
      <p style={{ fontFamily:S, fontSize:"clamp(0.88rem,1.8vw,1rem)",
                   color:"var(--text-secondary)", lineHeight:1.7,
                   maxWidth:540, margin:"0 0 1.5rem" }}>
        Verify your identity and your assets once. Get a credential that
        every lender, marketplace, and investor on the network already
        trusts. No re-verification, no repeated paperwork.
      </p>
      <div style={{ display:"flex", gap:"0.625rem", flexWrap:"wrap" }}>
        {STATS.map(s => (
          <div key={s.label}
            style={{ padding:"0.625rem 1rem", borderRadius:10,
                      background:"var(--surface-raised)",
                      border:`1px solid ${BDR}` }}>
            <div style={{ fontFamily:M, fontSize:"1.1rem",
                           fontWeight:700, color:"var(--text-primary)" }}>
              {s.value}
            </div>
            <div style={{ fontFamily:S, fontSize:"0.68rem",
                           color:"var(--text-muted)", marginTop:2 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface HeroPassportTeaserProps {
  onGetVerified: () => void;
}

export function HeroPassportTeaser({ onGetVerified }: HeroPassportTeaserProps) {
  return (
    <ScrollFade>
      <div style={{ marginBottom:"1.75rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                       marginBottom:"0.875rem" }}>
          <span style={{ fontFamily:S, fontSize:"0.95rem",
                          fontWeight:700, color:"var(--text-primary)" }}>
            Your Abraxas Passport
          </span>
          <span style={{ fontFamily:S, fontSize:"0.68rem", fontWeight:500,
                          color:G, background:`${G}12`,
                          borderRadius:20, padding:"0.2rem 0.7rem" }}>
            Verify once, use everywhere
          </span>
        </div>
        <div style={{ borderRadius:14, overflow:"hidden",
                       boxShadow:softShadow(G) }}>
          <AbraxasPassport
            onGetVerified={onGetVerified}
            earnedStamps={["identity", "compliance"]}
          />
        </div>
      </div>
    </ScrollFade>
  );
}
