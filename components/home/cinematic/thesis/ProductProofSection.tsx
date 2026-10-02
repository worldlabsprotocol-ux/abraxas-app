"use client";
// FILE: components/home/cinematic/thesis/ProductProofSection.tsx
// Real product flow — partner ask, holder consent, signed answer.

import { motion, useReducedMotion } from "framer-motion";
import { ABX_FONT_DISPLAY, ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import { abxMotionDuration } from "@/lib/design/abraxasMotion";
import { PRODUCT_PROOF_FOOTNOTE, PRODUCT_PROOF_STEPS } from "@/lib/home/cinematicHomeCopy";

const FONT = ABX_FONT_SANS;
const DISPLAY = ABX_FONT_DISPLAY;

export function ProductProofSection() {
  const reduce = useReducedMotion();
  const duration = reduce ? 0 : abxMotionDuration("protocol") / 1000;

  return (
    <section aria-labelledby="product-proof-heading" className="abx-cinematic-proof abx-home-section-center">
      <h2
        id="product-proof-heading"
        style={{
          fontFamily: DISPLAY,
          fontSize: "clamp(1.15rem, 3vw, 1.55rem)",
          fontWeight: 900,
          letterSpacing: "-0.03em",
          margin: "0 0 1.25rem",
          color: "var(--text-primary)",
        }}
      >
        REAL PRODUCT PROOF
      </h2>

      <ol className="abx-cinematic-proof__steps" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {PRODUCT_PROOF_STEPS.map((step, index) => (
          <motion.li
            key={step.id}
            className="abx-cinematic-proof__step"
            initial={reduce ? false : { opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration, delay: reduce ? 0 : index * 0.1 }}
          >
            <span className="abx-cinematic-proof__step-index">{index + 1}</span>
            <div>
              <p className="abx-cinematic-proof__step-title" style={{ fontFamily: FONT }}>
                {step.title}
              </p>
              <p className="abx-cinematic-proof__step-body" style={{ fontFamily: FONT }}>
                {step.body}
              </p>
            </div>
          </motion.li>
        ))}
      </ol>

      <p
        style={{
          fontFamily: FONT,
          fontSize: "0.85rem",
          color: "var(--text-secondary)",
          margin: "1.25rem auto 0",
          maxWidth: 480,
          lineHeight: 1.55,
        }}
      >
        {PRODUCT_PROOF_FOOTNOTE}
      </p>
    </section>
  );
}
