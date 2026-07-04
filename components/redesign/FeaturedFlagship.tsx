"use client";
// FILE: components/redesign/FeaturedFlagship.tsx
// Featured asset showcase — moved to ecosystem tier, with assurance taxonomy drawers.

import { motion } from "framer-motion";
import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";
import { CIELO_ASSURANCE_CLAIMS } from "@/lib/assuranceTaxonomy";
import { VerificationBadge } from "./VerificationBadge";
import { AssuranceDrawer } from "@/components/compliance/AssuranceDrawer";
import { Btn } from "./ui";
import { CieloBookingPanel } from "@/components/cielo/CieloBookingPanel";
import { CIELO_PORCH_IMAGE } from "@/lib/data/cieloMedia";
import { CieloPhoto } from "@/components/cielo/CieloPhoto";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const D = FLAGSHIP_PROPERTY;

export function FeaturedFlagship() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      id="featured-asset"
    >
      <div style={{ marginBottom: "1rem" }}>
        <div style={{
          fontFamily: FONT, fontSize: "0.7rem", fontWeight: 700,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.5rem",
        }}>
          Ecosystem showcase · Genesis pilot
        </div>
        <h2 style={{
          fontFamily: FONT, fontSize: "var(--fs-h1)", fontWeight: 800,
          letterSpacing: "-0.03em", lineHeight: 1.05,
          color: "var(--text-primary)", margin: 0,
        }}>
          {D.title}
        </h2>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
        gap: "1.25rem",
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid var(--border-strong)",
        background: "var(--surface-raised)",
        boxShadow: "var(--shadow-glow)",
      }}>
        <div style={{ position: "relative", minHeight: 320 }}>
          <CieloPhoto
            src={CIELO_PORCH_IMAGE.src}
            alt={CIELO_PORCH_IMAGE.alt}
            minHeight={320}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(6,9,11,0.85) 0%, transparent 50%)",
            pointerEvents: "none",
          }} />
          <div style={{ position: "absolute", top: 16, left: 16, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <VerificationBadge label="L3 attested · Live booking" color={ACCENT} check />
            <span style={{
              display: "inline-flex", padding: "0.35rem 0.65rem", borderRadius: 999,
              background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.25)",
              fontFamily: FONT, fontSize: "0.65rem", fontWeight: 700, color: "#fff",
            }}>
              ● Verify on /verify
            </span>
          </div>
          <div style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
            <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT,
                           letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
              {D.designation}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "1.5rem", fontWeight: 800, color: "#fff" }}>
              {D.title}
            </div>
          </div>
        </div>

        <div style={{ padding: "clamp(1.25rem, 3vw, 2rem)", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
            {D.tagline}. Real property, live on Airbnb, bookable on Abraxas with stablecoin.
            Each metric below includes assurance level and methodology.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.65rem" }}>
            {CIELO_ASSURANCE_CLAIMS.map(claim => (
              <AssuranceDrawer key={claim.label} claim={claim} compact />
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem" }}>
            <Btn href="/flagship#protocol-calendar" size="lg">View calendar →</Btn>
            <Btn href={`/verify?q=${encodeURIComponent(D.id)}`} variant="secondary" size="lg">Verify asset</Btn>
            <Btn href={D.airbnbUrl} newTab variant="ghost" size="lg">Airbnb listing</Btn>
          </div>

          <CieloBookingPanel variant="inline" />
        </div>
      </div>
    </motion.section>
  );
}
