"use client";
// FILE: components/home/cinematic/thesis/ReuseOrbitSection.tsx
// Verify once — conceptual policy asks orbit private evidence.

import { motion, useReducedMotion } from "framer-motion";
import { ABX_FONT_DISPLAY, ABX_FONT_MONO, ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import { REUSE_ORBIT_ASKS, REUSE_ORBIT_DISCLAIMER, REUSE_ORBIT_HEADLINE } from "@/lib/home/cinematicHomeCopy";

const FONT = ABX_FONT_SANS;
const DISPLAY = ABX_FONT_DISPLAY;

export function ReuseOrbitSection() {
  const reduce = useReducedMotion();

  return (
    <section aria-labelledby="reuse-orbit-heading" className="abx-cinematic-orbit abx-home-section-center">
      <h2
        id="reuse-orbit-heading"
        style={{
          fontFamily: DISPLAY,
          fontSize: "clamp(1.15rem, 3vw, 1.55rem)",
          fontWeight: 900,
          letterSpacing: "-0.03em",
          margin: "0 0 1.25rem",
          color: "var(--text-primary)",
        }}
      >
        {REUSE_ORBIT_HEADLINE}
      </h2>

      <div className="abx-cinematic-orbit__canvas">
        <div className="abx-cinematic-orbit__core" style={{ fontFamily: ABX_FONT_MONO }}>
          PRIVATE EVIDENCE
        </div>
        {REUSE_ORBIT_ASKS.map((ask, index) => (
          <motion.span
            key={ask}
            className="abx-cinematic-orbit__ask"
            style={{
              fontFamily: FONT,
              ["--orbit-i" as string]: index,
            }}
            initial={reduce ? false : { opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: reduce ? 0 : index * 0.06, duration: 0.4 }}
          >
            {ask}
          </motion.span>
        ))}
      </div>

      <p
        style={{
          fontFamily: FONT,
          fontSize: "0.72rem",
          color: "var(--text-muted)",
          margin: "1rem auto 0",
          maxWidth: 420,
        }}
      >
        {REUSE_ORBIT_DISCLAIMER}
      </p>
    </section>
  );
}
