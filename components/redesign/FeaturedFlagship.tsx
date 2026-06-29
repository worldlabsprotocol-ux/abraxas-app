"use client";
// FILE: components/redesign/FeaturedFlagship.tsx
// Hero feature for Cielo Sunrise — verified, cash-yielding genesis asset.

import { motion } from "framer-motion";
import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";
import { VerificationBadge } from "./VerificationBadge";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const D = FLAGSHIP_PROPERTY;
const yieldPct = `${(D.financials.cashYield * 100).toFixed(1)}%`;
const collateralScore = `${D.collateral.collateralScore}/100`;

export function FeaturedFlagship() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      id="featured-asset"
    >
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
        gap: 0,
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid var(--border-strong)",
        background: "var(--surface-raised)",
        boxShadow: "var(--shadow-glow)",
      }}>
        {/* Image */}
        <div style={{ position: "relative", minHeight: 320 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/cielo/01.jpg"
            alt="Cielo Sunrise"
            style={{ width: "100%", height: "100%", minHeight: 320, objectFit: "cover", display: "block" }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(6,9,11,0.85) 0%, transparent 50%)",
            pointerEvents: "none",
          }} />
          <div style={{ position: "absolute", top: 16, left: 16, display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "flex-start" }}>
            <VerificationBadge label="AAS-1 Verified · Genesis Asset" color={ACCENT} check />
            <a
              href={D.airbnbUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.35rem",
                padding: "0.35rem 0.65rem", borderRadius: 999,
                background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.25)",
                fontFamily: FONT, fontSize: "0.65rem", fontWeight: 700,
                color: "#fff", textDecoration: "none", backdropFilter: "blur(8px)",
              }}
            >
              ● Live on Airbnb · Superhost
            </a>
          </div>
          <div style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
            <div style={{
              fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
              color: ACCENT, letterSpacing: "0.12em", textTransform: "uppercase",
              marginBottom: "0.35rem",
            }}>
              {D.designation}
            </div>
            <div style={{
              fontFamily: FONT, fontSize: "1.5rem", fontWeight: 800,
              color: "#fff", letterSpacing: "-0.03em",
            }}>
              {D.title}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "clamp(1.25rem, 3vw, 2rem)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{
            fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
            lineHeight: 1.7, margin: "0 0 1.25rem",
          }}>
            {D.tagline}. Mineral Bluff, Georgia. Real property — bookable today on Airbnb.
            This is what a fully verified asset looks like on Abraxas: real title, real revenue
            history, real collateral score, and stablecoin booking when you are verified.
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.65rem",
            marginBottom: "1.35rem",
          }}>
            {[
              { l: "Appraised", v: "$1.1M" },
              { l: "Cash yield", v: yieldPct, accent: true },
              { l: "Collateral", v: collateralScore },
            ].map(m => (
              <div key={m.l} style={{
                padding: "0.75rem", borderRadius: 12,
                background: "var(--surface)", border: "1px solid var(--border)",
              }}>
                <div style={{
                  fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
                  color: "var(--text-muted)", letterSpacing: "0.08em",
                  textTransform: "uppercase", marginBottom: 4,
                }}>
                  {m.l}
                </div>
                <div style={{
                  fontFamily: "'Space Grotesk',sans-serif", fontSize: "1.1rem",
                  fontWeight: 700, color: m.accent ? ACCENT : "var(--text-primary)",
                }}>
                  {m.v}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            display: "flex", flexWrap: "wrap", gap: "0.35rem",
            marginBottom: "1.35rem",
          }}>
            {["Title verified", "Identity on record", "Revenue attested", "W3C credential"].map(tag => (
              <span key={tag} style={{
                padding: "0.3rem 0.65rem", borderRadius: 999,
                background: `${ACCENT}10`, border: `1px solid ${ACCENT}30`,
                fontFamily: FONT, fontSize: "0.68rem", fontWeight: 600, color: ACCENT,
              }}>
                ✓ {tag}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem" }}>
            <Btn href="/flagship" size="lg">View full verification →</Btn>
            <Btn href={D.airbnbUrl} newTab variant="secondary" size="lg">
              View live Airbnb listing →
            </Btn>
            <Btn href="/passport" variant="ghost" size="lg">Get verified to book</Btn>
          </div>
          <p style={{
            fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)",
            margin: "0.75rem 0 0", lineHeight: 1.55,
          }}>
            Active Superhost listing in Mineral Bluff, GA — not a render or mock.
            Verification required before stablecoin checkout on Abraxas.
          </p>
        </div>
      </div>
    </motion.section>
  );
}
