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
  { label: "Verified assets",  value: "6" },
  { label: "Value attested",   value: "$1.6M+" },
  { label: "Credential standard", value: "W3C" },
];

export function HeroIntro() {
  return (
    <div style={{ marginBottom:"1.5rem", paddingBottom:"1.5rem",
                   borderBottom:`1px solid ${BDR}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:"0.625rem",
                     marginBottom:"0.75rem" }}>
        <span style={{ fontFamily:S, fontSize:"0.78rem", fontWeight:600, color:G }}>
          Abraxas
        </span>
        <span style={{ display:"flex", alignItems:"center", gap:"0.3rem",
                        padding:"0.2rem 0.625rem", borderRadius:20,
                        background:`${G}12` }}>
          <span style={{ width:6, height:6, borderRadius:"50%",
                          background:G, animation:"abraxasPulse 2s infinite" }} />
          <span style={{ fontFamily:S, fontSize:"0.62rem", fontWeight:700,
                          color:G, letterSpacing:"0.04em" }}>
            PROTOCOL READY
          </span>
        </span>
      </div>
      <style>{`@keyframes abraxasPulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }`}</style>
      <h1 style={{ fontFamily:S,
                    fontSize:"clamp(1.7rem,4.2vw,2.75rem)", fontWeight:700,
                    color:"var(--text-primary)", lineHeight:1.15, letterSpacing:"-0.02em",
                    margin:"0 0 0.875rem" }}>
        Know what's real
        <br />
        before you trust it.
      </h1>
      <p style={{ fontFamily:S, fontSize:"clamp(0.88rem,1.8vw,1rem)",
                   color:"var(--text-secondary)", lineHeight:1.7,
                   maxWidth:540, margin:"0 0 1.25rem" }}>
        Land, businesses, royalties, mineral rights, anything real. See
        what's actually verified before you put money or trust behind it,
        not just a listing and someone's word.
      </p>

      {/* The original two buttons, restored exactly, not my invented
          demo-walkthrough trigger from last time */}
      <div style={{ display:"flex", gap:"0.625rem", flexWrap:"wrap",
                     marginBottom:"0.625rem" }}>
        <a href="/terminal#demo-assets"
          style={{ padding:"0.7rem 1.5rem", borderRadius:8, border:"none",
                    background:G, color:"#000", fontFamily:S,
                    fontSize:"0.85rem", fontWeight:700, cursor:"pointer",
                    textDecoration:"none", display:"inline-block" }}>
          Enter Protocol
        </a>
        <button onClick={() => { window.location.href = "/terminal?signin=1"; }}
          style={{ padding:"0.7rem 1.5rem", borderRadius:8,
                    border:`1.5px solid ${G}`, background:"transparent",
                    color:G, fontFamily:S, fontSize:"0.85rem", fontWeight:700,
                    cursor:"pointer" }}>
          Sign in
        </button>
      </div>
      <div style={{ marginBottom:"1.5rem" }}>
        <span style={{ fontFamily:S, fontSize:"0.66rem",
                        color:"var(--text-muted)" }}>
          You may see a quick "I'm not a robot" check when signing in,
          that's normal security, not something meant to slow you down.
        </span>
      </div>

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
      <div style={{ display:"flex", justifyContent:"center",
                     marginTop:"1.5rem" }}>
        <div style={{ display:"flex", flexDirection:"column",
                       alignItems:"center", gap:"0.3rem",
                       animation:"abraxasBounce 2s infinite" }}>
          <span style={{ fontFamily:S, fontSize:"0.6rem", fontWeight:600,
                          color:"var(--text-muted)", letterSpacing:"0.1em" }}>
            SCROLL
          </span>
          <span style={{ color:G, fontSize:"0.85rem" }}>▾</span>
        </div>
      </div>
      <style>{`@keyframes abraxasBounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(5px); } }`}</style>
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
            The Abraxas Passport
          </span>
          <span style={{ fontFamily:S, fontSize:"0.68rem", fontWeight:500,
                          color:G, background:`${G}12`,
                          borderRadius:20, padding:"0.2rem 0.7rem" }}>
            Verify once, use everywhere
          </span>
        </div>
        <div style={{ fontFamily:S, fontSize:"0.72rem",
                       color:"var(--text-muted)", marginBottom:"0.875rem" }}>
          Every stamp shown below, this is what a fully verified Passport
          looks like. Yours starts empty and fills in as you complete each step.
        </div>
        <div style={{ borderRadius:14, overflow:"hidden",
                       boxShadow:softShadow(G) }}>
          <AbraxasPassport
            onGetVerified={onGetVerified}
            earnedStamps={["identity", "biometric", "business", "investor", "owner", "royalty", "property", "tribal", "compliance", "lending"]}
          />
        </div>
      </div>
    </ScrollFade>
  );
}
