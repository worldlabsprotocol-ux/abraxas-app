"use client";
// FILE: components/redesign/RedesignHero.tsx
// Infrastructure-first hero: Verify Once. Transact Everywhere.

import { motion } from "framer-motion";
import { Btn } from "./ui";
import { VerificationBadge } from "./VerificationBadge";
import { staggerContainer, staggerItem } from "@/lib/motion/variants";
import { RegistryHeroPanel } from "./RegistryHeroPanel";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

function PhotoHeroPanel() {
  return <RegistryHeroPanel />;
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
