"use client";
// FILE: components/redesign/FeaturedFlagship.tsx

import { motion } from "framer-motion";
import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";
import { VerificationBadge } from "./VerificationBadge";
import { Btn } from "./ui";
import { CieloBookingPanel } from "@/components/cielo/CieloBookingPanel";

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
        gap: "1.25rem",
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid var(--border-strong)",
        background: "var(--surface-raised)",
        boxShadow: "var(--shadow-glow)",
      }}>
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
          <div style={{ position: "absolute", top: 16, left: 16, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <VerificationBadge label="Verified property · Live booking" color={ACCENT} check />
            <span style={{
              display: "inline-flex", padding: "0.35rem 0.65rem", borderRadius: 999,
              background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.25)",
              fontFamily: FONT, fontSize: "0.65rem", fontWeight: 700, color: "#fff",
            }}>
              ● Pay with stablecoin
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
            Check availability on the live calendar — cross-check the public listing anytime.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.65rem" }}>
            {[
              { l: "Appraised", v: "$1.1M" },
              { l: "Cash yield", v: yieldPct, accent: true },
              { l: "Collateral", v: collateralScore },
            ].map(m => (
              <div key={m.l} style={{ padding: "0.75rem", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div style={{ fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>{m.l}</div>
                <div style={{ fontFamily: FONT, fontSize: "1.1rem", fontWeight: 700, color: m.accent ? ACCENT : "var(--text-primary)" }}>{m.v}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem" }}>
            <Btn href="/flagship#protocol-calendar" size="lg">View calendar →</Btn>
            <Btn href="/flagship" variant="secondary" size="lg">Full dossier</Btn>
            <Btn href={D.airbnbUrl} newTab variant="ghost" size="lg">Airbnb listing</Btn>
          </div>

          <CieloBookingPanel variant="inline" />
        </div>
      </div>
    </motion.section>
  );
}
