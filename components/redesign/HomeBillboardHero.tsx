"use client";
// FILE: components/redesign/HomeBillboardHero.tsx
// Billboard opener — logo, headline, instant context, network visual.

import Image from "next/image";
import { motion } from "framer-motion";
import { Btn } from "./ui";
import { VerificationBadge } from "./VerificationBadge";
import { NetworkHeroPanel } from "./NetworkHeroPanel";
import { PLAIN_LANGUAGE_OPENER } from "@/lib/kycThesis";
import { staggerContainer, staggerItem } from "@/lib/motion/variants";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function HomeBillboardHero() {
  return (
    <section
      id="top"
      aria-labelledby="billboard-heading"
      style={{
        position: "relative",
        zIndex: 1,
        padding: "clamp(1.75rem, 5vw, 3.25rem) 0 clamp(1.25rem, 3vw, 2rem)",
      }}
    >
      <div
        className="billboard-hero-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "clamp(1.75rem, 4vw, 2.75rem)",
          alignItems: "center",
        }}
      >
        <motion.div variants={staggerContainer(0.08, 0.04)} initial="hidden" animate="show">
          <motion.div variants={staggerItem} style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "1.1rem" }}>
            <Image
              src="/icon-48.png"
              alt=""
              width={44}
              height={44}
              priority
              style={{ display: "block", borderRadius: 11, boxShadow: "0 0 24px rgba(16,185,129,0.25)" }}
            />
            <span
              style={{
                fontFamily: FONT,
                fontSize: "clamp(1.35rem, 3.2vw, 1.85rem)",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                color: "var(--text-primary)",
                lineHeight: 1,
              }}
            >
              Abraxas
            </span>
          </motion.div>

          <motion.div variants={staggerItem} style={{ marginBottom: "1rem" }}>
            <VerificationBadge label="Verification network for RWAs" color={ACCENT} check />
          </motion.div>

          <motion.h1
            id="billboard-heading"
            variants={staggerItem}
            style={{
              fontFamily: FONT,
              fontSize: "var(--fs-display)",
              fontWeight: 900,
              letterSpacing: "-0.045em",
              lineHeight: 0.95,
              color: "var(--text-primary)",
              margin: "0 0 1rem",
              maxWidth: 640,
            }}
          >
            Verify once.
            <br />
            <span style={{ color: ACCENT }}>Transact everywhere.</span>
          </motion.h1>

          <motion.p
            variants={staggerItem}
            style={{
              fontFamily: FONT,
              fontSize: "clamp(0.92rem, 2vw, 1.02rem)",
              fontWeight: 600,
              color: "var(--text-primary)",
              lineHeight: 1.6,
              maxWidth: 560,
              margin: "0 0 0.75rem",
            }}
          >
            {PLAIN_LANGUAGE_OPENER}
          </motion.p>

          <motion.p
            variants={staggerItem}
            style={{
              fontFamily: FONT,
              fontSize: "0.78rem",
              color: "var(--text-secondary)",
              lineHeight: 1.65,
              maxWidth: 520,
              margin: "0 0 1.5rem",
            }}
          >
            Sign in with Google · browse verified assets first · ID check only when a partner policy requires it
          </motion.p>

          <motion.div
            variants={staggerItem}
            style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", marginBottom: "0.65rem" }}
          >
            <Btn href="#get-started" size="lg">Create my Passport →</Btn>
            <Btn href="#test-network" variant="secondary" size="lg">Test the network</Btn>
            <Btn href="/verify" variant="tertiary" size="lg">Verify records</Btn>
          </motion.div>
        </motion.div>

        <div style={{ position: "relative" }}>
          <NetworkHeroPanel />
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .billboard-hero-grid { grid-template-columns: 1.05fr 0.95fr !important; }
        }
      `}</style>
    </section>
  );
}
