"use client";
// FILE: components/terminal/HeroSection.tsx
// Full hero zone: split layout + integrated filter bar, reference RWA style.

import { AbraxasPassport } from "@/components/identity/AbraxasPassport";
import { M, S, G, softShadow } from "./tokens";
import { ScrollFade } from "./ui";
import { HeroVisual } from "./HeroVisual";
import { MarketplaceFilterBar } from "./MarketplaceFilterBar";

const STATS = [
  { label: "Verified assets", value: "6" },
  { label: "Value attested", value: "Just Under $2M" },
  { label: "Credential standard", value: "W3C" },
];

export function HeroIntro() {
  return (
    <section style={{ marginBottom: "2rem" }}>
      <style>{`
        @keyframes abraxasPulse { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
        @keyframes abraxasBounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(6px); } }
        .abr-hero-shell {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
          align-items: center;
          padding: clamp(1.25rem, 3vw, 2rem);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          background: var(--surface-glass);
          backdrop-filter: blur(var(--glass-blur));
          -webkit-backdrop-filter: blur(var(--glass-blur));
          box-shadow: var(--shadow-soft);
          position: relative;
          overflow: hidden;
        }
        @media (min-width: 860px) {
          .abr-hero-shell { grid-template-columns: 1.05fr 0.95fr; }
        }
      `}</style>

      <div className="abr-hero-shell">
        <div style={{
          position: "absolute",
          top: "-40%",
          right: "-10%",
          width: "60%",
          height: "80%",
          background: "var(--hero-accent)",
          borderRadius: "50%",
          filter: "blur(40px)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.25rem 0.75rem",
            borderRadius: 999,
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.3)",
            marginBottom: "1rem",
          }}>
            <span style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: G,
              animation: "abraxasPulse 2s infinite",
            }} />
            <span style={{
              fontFamily: S,
              fontSize: "0.68rem",
              fontWeight: 700,
              color: G,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}>
              Verification layer for real-world assets
            </span>
          </div>

          <h1 style={{
            fontFamily: S,
            fontSize: "clamp(2rem, 5vw, 3.2rem)",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.08,
            letterSpacing: "-0.035em",
            margin: "0 0 1rem",
          }}>
            Invest in real assets
            <br />
            <span style={{ color: G }}>through verified Web3</span>
          </h1>

          <p style={{
            fontFamily: S,
            fontSize: "clamp(0.92rem, 1.9vw, 1.05rem)",
            color: "var(--text-secondary)",
            lineHeight: 1.75,
            maxWidth: 520,
            margin: "0 0 1.5rem",
          }}>
            Full control, transparency, and profitability with verified issuers.
            Know what's real before you trust it, not just a listing and someone's word.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            <a href="/passport"
              style={{
                padding: "0.85rem 1.85rem",
                borderRadius: 999,
                border: "none",
                background: "#0A0A0B",
                color: G,
                fontFamily: S,
                fontSize: "0.92rem",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "var(--shadow-glow)",
              }}>
              Start verifying
            </a>
            <a href="/terminal#demo-assets"
              style={{
                padding: "0.85rem 1.85rem",
                borderRadius: 999,
                border: `1.5px solid ${G}`,
                background: "transparent",
                color: G,
                fontFamily: S,
                fontSize: "0.92rem",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: `0 0 24px rgba(16,185,129,0.15)`,
              }}>
              Browse verified assets
            </a>
            <a href="/terminal?demo=1"
              style={{
                padding: "0.85rem 1.85rem",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "var(--surface-raised)",
                color: "var(--text-secondary)",
                fontFamily: S,
                fontSize: "0.92rem",
                fontWeight: 600,
                textDecoration: "none",
              }}>
              Take a tour
            </a>
          </div>
          <div style={{ marginBottom: "1.25rem" }}>
            <span style={{
              fontFamily: S,
              fontSize: "0.68rem",
              color: "var(--text-muted)",
            }}>
              No wallet required to browse or verify. Connect in the top nav when you are ready to pay in stablecoin.
            </span>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {STATS.map(s => (
              <div key={s.label} style={{
                padding: "0.75rem 1.1rem",
                borderRadius: 16,
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                minWidth: 130,
              }}>
                <div style={{
                  fontFamily: M,
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}>
                  {s.value}
                </div>
                <div style={{
                  fontFamily: S,
                  fontSize: "0.68rem",
                  color: "var(--text-muted)",
                  marginTop: 3,
                }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 1, minHeight: 240 }}>
          <HeroVisual />
        </div>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <MarketplaceFilterBar embedded />
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: "1.25rem" }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.3rem",
          animation: "abraxasBounce 2s infinite",
        }}>
          <span style={{
            fontFamily: S,
            fontSize: "0.6rem",
            fontWeight: 600,
            color: "var(--text-muted)",
            letterSpacing: "0.12em",
          }}>
            SCROLL
          </span>
          <span style={{ color: G, fontSize: "0.9rem" }}>▾</span>
        </div>
      </div>
    </section>
  );
}

interface HeroPassportTeaserProps {
  onGetVerified: () => void;
}

export function HeroPassportTeaser({ onGetVerified }: HeroPassportTeaserProps) {
  return (
    <ScrollFade>
      <div style={{
        marginBottom: "2rem",
        padding: "1.25rem",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-strong)",
        background: "var(--surface-glass)",
        backdropFilter: "blur(var(--glass-blur))",
        WebkitBackdropFilter: "blur(var(--glass-blur))",
        boxShadow: "var(--shadow-glow)",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.875rem",
          flexWrap: "wrap",
        }}>
          <span style={{
            fontFamily: S,
            fontSize: "1.05rem",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}>
            The Abraxas Passport
          </span>
          <span style={{
            fontFamily: S,
            fontSize: "0.68rem",
            fontWeight: 600,
            color: G,
            background: "rgba(16,185,129,0.12)",
            borderRadius: 999,
            padding: "0.25rem 0.75rem",
            border: "1px solid rgba(16,185,129,0.28)",
          }}>
            Verify once, use everywhere
          </span>
        </div>
        <div style={{
          fontFamily: S,
          fontSize: "0.78rem",
          color: "var(--text-muted)",
          marginBottom: "1rem",
          lineHeight: 1.65,
        }}>
          Every stamp shown below is what a fully verified Passport looks like.
          Yours starts empty and fills in as you complete each step.
        </div>
        <div style={{
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: softShadow(G),
          border: "1px solid rgba(16,185,129,0.2)",
        }}>
          <AbraxasPassport
            onGetVerified={onGetVerified}
            earnedStamps={["identity", "biometric", "business", "investor", "owner", "royalty", "property", "tribal", "compliance", "lending", "social"]}
          />
        </div>
      </div>
    </ScrollFade>
  );
}
