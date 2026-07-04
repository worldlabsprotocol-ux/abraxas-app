"use client";
// FILE: components/redesign/RedesignHero.tsx
// Infrastructure-first hero: Verify Once. Transact Everywhere.

import { motion } from "framer-motion";
import { Btn } from "./ui";
import { VerificationBadge } from "./VerificationBadge";
import { staggerContainer, staggerItem } from "@/lib/motion/variants";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

function PhotoHeroPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      style={{
        position: "relative", borderRadius: 20, overflow: "hidden",
        border: "1px solid var(--border-strong)",
        boxShadow: "var(--shadow-glow)", minHeight: 360,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/cielo/08.jpg"
        alt="Cielo Sunrise verified property"
        style={{ width: "100%", height: "100%", minHeight: 360, objectFit: "cover", display: "block" }}
      />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to top, rgba(6,9,11,0.92) 0%, rgba(6,9,11,0.15) 50%, transparent 100%)",
      }} />
      <div style={{ position: "absolute", top: 16, left: 16, right: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <VerificationBadge label="L3 attested · Live booking" color={ACCENT} check />
        <span style={{
          fontFamily: "'JetBrains Mono',monospace", fontSize: "0.55rem", fontWeight: 700,
          padding: "0.25rem 0.5rem", borderRadius: 999,
          background: "rgba(0,0,0,0.6)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)",
        }}>
          ABX-RE-HOSP-001
        </span>
      </div>
      <div style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
        <div style={{ fontFamily: FONT, fontSize: "1.15rem", fontWeight: 800, color: "#fff", marginBottom: "0.35rem" }}>
          Cielo Sunrise · $1.1M verified
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.75)", marginBottom: "0.75rem" }}>
          Real property · Live Airbnb · USDC booking on Sui
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Btn href="/verify?q=ABX-RE-HOSP-001" size="sm">Verify on-chain →</Btn>
          <Btn href="/flagship" variant="secondary" size="sm">Full dossier</Btn>
        </div>
      </div>
    </motion.div>
  );
}

export function RedesignHero() {
  return (
    <section style={{ position: "relative", zIndex: 1, padding: "clamp(2.5rem, 7vw, 5.5rem) 0 clamp(2rem,5vw,3.5rem)" }}>
      <div className="rd-hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr",
                                              gap: "clamp(2rem, 5vw, 3.5rem)", alignItems: "center" }}>
        <motion.div variants={staggerContainer(0.1, 0.05)} initial="hidden" animate="show">
          <motion.div variants={staggerItem} style={{ marginBottom: "1.25rem" }}>
            <VerificationBadge label="Registry infrastructure layer for RWAs" color={ACCENT} />
          </motion.div>

          <motion.h1 variants={staggerItem} style={{
            fontFamily: FONT, fontSize: "var(--fs-display)", fontWeight: 800,
            letterSpacing: "-0.04em", lineHeight: 0.98, color: "var(--text-primary)",
            margin: "0 0 1.2rem",
          }}>
            Verify once.<br />
            <span style={{ color: ACCENT }}>Transact everywhere.</span>
          </motion.h1>

          <motion.p variants={staggerItem} style={{
            fontFamily: FONT, fontSize: "var(--fs-body)", color: "var(--text-secondary)",
            lineHeight: 1.7, maxWidth: 540, margin: "0 0 1.75rem",
          }}>
            Prove what&apos;s real — your identity and your assets — without repeating the same checks everywhere.
            Sign in with Google. Browse verified properties first. ID check only when a deal needs it.
          </motion.p>

          <motion.div variants={staggerItem} style={{ display: "flex", gap: "0.75rem",
                                                       flexWrap: "wrap", marginBottom: "2rem" }}>
            <Btn href="/passport" size="lg">Create my passport →</Btn>
            <Btn href="/verify" variant="secondary" size="lg">Scan public registry</Btn>
          </motion.div>
          <motion.p variants={staggerItem} style={{
            fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
            margin: "0", maxWidth: 480,
          }}>
            Sign in with Google · no seed phrase · ID check only when a deal requires it
          </motion.p>
        </motion.div>

        <div style={{ position: "relative" }}>
          <PhotoHeroPanel />
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .rd-hero-grid { grid-template-columns: 1.05fr 0.95fr !important; }
        }
      `}</style>
    </section>
  );
}
