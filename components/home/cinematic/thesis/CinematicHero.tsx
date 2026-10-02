"use client";
// FILE: components/home/cinematic/thesis/CinematicHero.tsx
// Cinematic opening — thesis-first, explicit CTAs.

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Btn } from "@/components/redesign/ui";
import { SplitHeadline } from "@/lib/motion/cinematic/SplitHeadline";
import { ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import { abxMotionDuration } from "@/lib/design/abraxasMotion";
import {
  CINEMATIC_CTA_PRIMARY,
  CINEMATIC_CTA_PRIMARY_HREF,
  CINEMATIC_CTA_SECONDARY,
  CINEMATIC_CTA_SECONDARY_HREF,
  CINEMATIC_HERO_SUPPORT,
  CINEMATIC_THESIS_LINE_1,
  CINEMATIC_THESIS_LINE_2,
} from "@/lib/home/cinematicHomeCopy";

const FONT = ABX_FONT_SANS;

export function CinematicHero() {
  const reduce = useReducedMotion();
  const duration = reduce ? 0 : abxMotionDuration("reveal") / 1000;

  return (
    <section
      id="top"
      aria-labelledby="cinematic-hero-heading"
      className="abx-home-hero abx-cinematic-hero abx-atmosphere-hero"
    >
      <SplitHeadline
        id="cinematic-hero-heading"
        lines={[CINEMATIC_THESIS_LINE_1, CINEMATIC_THESIS_LINE_2]}
      />

      <motion.p
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration, delay: reduce ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
          fontWeight: 500,
          color: "var(--text-secondary)",
          margin: "1.35rem auto 0",
          maxWidth: 520,
          lineHeight: 1.55,
        }}
      >
        {CINEMATIC_HERO_SUPPORT}
      </motion.p>

      <motion.div
        className="abx-home-hero-actions abx-cinematic-hero__actions"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration, delay: reduce ? 0 : 0.42, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginTop: "1.75rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center" }}
      >
        <Btn href={CINEMATIC_CTA_PRIMARY_HREF} size="lg">
          {CINEMATIC_CTA_PRIMARY}
        </Btn>
        <Link
          href={CINEMATIC_CTA_SECONDARY_HREF}
          className="abx-cinematic-hero__secondary-cta"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.85rem 1.25rem",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            color: "var(--text-primary)",
            fontFamily: FONT,
            fontSize: "0.88rem",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          {CINEMATIC_CTA_SECONDARY}
        </Link>
      </motion.div>
    </section>
  );
}
