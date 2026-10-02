"use client";
// FILE: components/home/HomeBuyerContextSection.tsx
// Buyer problem + outcome near fold — complements cinematic thesis.

import { motion, useReducedMotion } from "framer-motion";
import { ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import { abxMotionTransition, abxStaggerDelay } from "@/lib/motion/abxMotionFramer";
import {
  HOME_BUYER_EYEBROW,
  HOME_BUYER_OUTCOME,
  HOME_BUYER_PROBLEM,
  HOME_KEEP_KYC_PROVIDER,
} from "@/lib/gtm/homeCopy";

const FONT = ABX_FONT_SANS;

export function HomeBuyerContextSection() {
  const reduce = useReducedMotion();

  return (
    <section
      aria-labelledby="home-buyer-context-heading"
      className="abx-home-section-center abx-home-buyer-context"
      style={{ width: "100%", maxWidth: 640, textAlign: "center" }}
    >
      <motion.p
        className="abx-eyebrow-violet"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={abxMotionTransition("reveal", { delay: reduce ? 0 : abxStaggerDelay(1, "sm"), tier: "cinematic" })}
        style={{
          margin: "0 0 0.65rem",
          letterSpacing: "0.12em",
          fontFamily: FONT,
          fontSize: "0.72rem",
          fontWeight: 700,
          color: "#2DD4BF",
        }}
      >
        {HOME_BUYER_EYEBROW}
      </motion.p>

      <motion.h2
        id="home-buyer-context-heading"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={abxMotionTransition("reveal", { delay: reduce ? 0 : abxStaggerDelay(2, "sm"), tier: "cinematic" })}
        style={{
          margin: "0 0 0.75rem",
          fontFamily: FONT,
          fontSize: "clamp(1.05rem, 2.8vw, 1.35rem)",
          fontWeight: 800,
          lineHeight: 1.25,
          letterSpacing: "-0.02em",
          color: "var(--text-primary)",
        }}
      >
        {HOME_BUYER_PROBLEM}
      </motion.h2>

      <motion.p
        initial={reduce ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={abxMotionTransition("reveal", { delay: reduce ? 0 : abxStaggerDelay(3, "sm"), tier: "cinematic" })}
        style={{
          margin: "0 0 0.65rem",
          fontFamily: FONT,
          fontSize: "clamp(0.92rem, 2.2vw, 1.02rem)",
          lineHeight: 1.6,
          color: "var(--text-secondary)",
        }}
      >
        {HOME_BUYER_OUTCOME}
      </motion.p>

      <motion.p
        initial={reduce ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={abxMotionTransition("reveal", { delay: reduce ? 0 : abxStaggerDelay(4, "sm"), tier: "cinematic" })}
        style={{
          margin: 0,
          fontFamily: FONT,
          fontSize: "clamp(0.86rem, 2vw, 0.95rem)",
          lineHeight: 1.55,
          color: "var(--text-muted)",
        }}
      >
        {HOME_KEEP_KYC_PROVIDER}
      </motion.p>
    </section>
  );
}
