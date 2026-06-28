"use client";
// FILE: components/terminal/HeroSection.tsx
// Split hero: headline left, visual right. Passport teaser follows below.

import { AbraxasPassport } from "@/components/identity/AbraxasPassport";
import { M, S, G, BDR, softShadow } from "./tokens";
import { ScrollFade } from "./ui";
import { HeroVisual } from "./HeroVisual";

const STATS: Array<{ label: string; value: string }> = [
  { label: "Verified assets",  value: "6" },
  { label: "Value attested",   value: "Just Under $2M" },
  { label: "Credential standard", value: "W3C" },
];

export function HeroIntro() {
  return (
    <div style={{
      marginBottom: "1.5rem",
      paddingBottom: "1.5rem",
      borderBottom: `1px solid ${BDR}`,
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        gap: "1.5rem",
        alignItems: "center",
      }}>
        <style>{`
          @media (min-width: 768px) {
            .abr-hero-grid { grid-template-columns: minmax(0, 1.1fr) minmax(220px, 0.9fr) !important; }
          }
          @keyframes abraxasPulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
          @keyframes abraxasBounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(5px); } }
        `}</style>
        <div className="abr-hero-grid" style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: "1.5rem",
          alignItems: "center",
        }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"0.625rem",
                           marginBottom:"0.75rem" }}>
              <svg width={28} height={28} viewBox="0 0 40 40" fill="none">
                <polygon points="20,2 38,20 20,38 2,20"
                  stroke={G} strokeWidth="2" fill="none"/>
                <polygon points="20,8 32,20 20,32 8,20"
                  stroke={G} strokeWidth="1.5" fill={`${G}1A`}/>
                <circle cx="20" cy="20" r="3" fill={G}/>
              </svg>
              <span style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:900,
                              letterSpacing:"0.06em", color:G }}>
                ABRAXAS
              </span>
              <span style={{ display:"flex", alignItems:"center", gap:"0.3rem",
                              padding:"0.2rem 0.625rem", borderRadius:20,
                              background:`${G}12`, border:`1px solid ${G}30` }}>
                <span style={{ width:6, height:6, borderRadius:"50%",
                                background:G, animation:"abraxasPulse 2s infinite" }} />
                <span style={{ fontFamily:S, fontSize:"0.62rem", fontWeight:700,
                                color:G, letterSpacing:"0.04em" }}>
                  PROTOCOL READY
                </span>
              </span>
            </div>
            <h1 style={{ fontFamily:S,
                          fontSize:"clamp(1.85rem,4.5vw,2.85rem)", fontWeight:700,
                          color:"var(--text-primary)", lineHeight:1.12,
                          letterSpacing:"-0.03em", margin:"0 0 0.875rem" }}>
              Know what's real
              <br />
              before you trust it.
            </h1>
            <p style={{ fontFamily:S, fontSize:"clamp(0.88rem,1.8vw,1.02rem)",
                         color:"var(--text-secondary)", lineHeight:1.7,
                         maxWidth:540, margin:"0 0 1.25rem" }}>
              Real estate. Royalties. Mineral rights. Businesses. Anything real.
              See what's actually verified before you put money or trust behind it,
              not just a listing and someone's word.
            </p>

            <div style={{ display:"flex", gap:"0.625rem", flexWrap:"wrap",
                           marginBottom:"0.625rem" }}>
              <a href="/terminal#demo-assets"
                style={{
                  padding:"0.75rem 1.65rem", borderRadius:999, border:"none",
                  background:G, color:"#000", fontFamily:S,
                  fontSize:"0.88rem", fontWeight:700, cursor:"pointer",
                  textDecoration:"none", display:"inline-block",
                  boxShadow:`0 0 0 1px ${G}55, 0 0 28px ${G}35`,
                }}>
                Enter Protocol
              </a>
              <button onClick={() => { window.location.href = "/terminal?signin=1"; }}
                style={{
                  padding:"0.75rem 1.65rem", borderRadius:999,
                  border:`1.5px solid ${G}`, background:"var(--surface)",
                  color:G, fontFamily:S, fontSize:"0.88rem", fontWeight:700,
                  cursor:"pointer",
                  boxShadow:`0 0 20px ${G}18`,
                }}>
                Join Waitlist
              </button>
            </div>
            <div style={{ marginBottom:"1.25rem" }}>
              <span style={{ fontFamily:S, fontSize:"0.66rem",
                              color:"var(--text-muted)" }}>
                You may see a quick "I'm not a robot" check when signing in,
                that's normal security, not something meant to slow you down.
              </span>
            </div>

            <div style={{ display:"flex", gap:"0.625rem", flexWrap:"wrap" }}>
              {STATS.map(s => (
                <div key={s.label}
                  style={{ padding:"0.75rem 1rem", borderRadius:14,
                            background:"var(--surface-raised)",
                            border:`1px solid ${BDR}`,
                            boxShadow:"var(--shadow-soft)",
                            minWidth: 120 }}>
                  <div style={{ fontFamily:M, fontSize:"1.05rem",
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

          <div style={{ display:"none" }} className="abr-hero-visual-wrap">
            <HeroVisual />
          </div>
        </div>
        <style>{`
          @media (min-width: 768px) {
            .abr-hero-visual-wrap { display: block !important; }
          }
        `}</style>
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
                       marginBottom:"0.875rem", flexWrap:"wrap" }}>
          <span style={{ fontFamily:S, fontSize:"0.95rem",
                          fontWeight:700, color:"var(--text-primary)" }}>
            The Abraxas Passport
          </span>
          <span style={{ fontFamily:S, fontSize:"0.68rem", fontWeight:500,
                          color:G, background:`${G}12`,
                          borderRadius:20, padding:"0.2rem 0.7rem",
                          border:`1px solid ${G}28` }}>
            Verify once, use everywhere
          </span>
        </div>
        <div style={{ fontFamily:S, fontSize:"0.72rem",
                       color:"var(--text-muted)", marginBottom:"0.875rem" }}>
          Every stamp shown below, this is what a fully verified Passport
          looks like. Yours starts empty and fills in as you complete each step.
        </div>
        <div style={{ borderRadius:18, overflow:"hidden",
                       boxShadow:softShadow(G), border:`1px solid ${G}25` }}>
          <AbraxasPassport
            onGetVerified={onGetVerified}
            earnedStamps={["identity", "biometric", "business", "investor", "owner", "royalty", "property", "tribal", "compliance", "lending", "social"]}
          />
        </div>
      </div>
    </ScrollFade>
  );
}
