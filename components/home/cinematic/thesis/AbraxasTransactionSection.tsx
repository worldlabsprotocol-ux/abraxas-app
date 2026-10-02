"use client";
// FILE: components/home/cinematic/thesis/AbraxasTransactionSection.tsx
// Application → Abraxas boundary → signed narrow result.

import { motion, useReducedMotion } from "framer-motion";
import { ABX_FONT_DISPLAY, ABX_FONT_MONO, ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import { abxMotionDuration } from "@/lib/design/abraxasMotion";
import {
  TRANSACTION_PARTNER_ASK,
  TRANSACTION_PARTNER_RECEIVES,
} from "@/lib/home/cinematicHomeCopy";

const FONT = ABX_FONT_SANS;
const DISPLAY = ABX_FONT_DISPLAY;
const MONO = ABX_FONT_MONO;

const STEPS = [
  { label: "APPLICATION", detail: TRANSACTION_PARTNER_ASK },
  { label: "ABRAXAS", detail: "PRIVATE EVIDENCE" },
  { label: "SIGNED RESULT", detail: TRANSACTION_PARTNER_RECEIVES },
] as const;

export function AbraxasTransactionSection() {
  const reduce = useReducedMotion();
  const duration = reduce ? 0 : abxMotionDuration("transfer") / 1000;

  return (
    <section aria-labelledby="abraxas-transaction-heading" className="abx-cinematic-transaction abx-home-section-center">
      <h2
        id="abraxas-transaction-heading"
        style={{
          fontFamily: DISPLAY,
          fontSize: "clamp(1.15rem, 3vw, 1.65rem)",
          fontWeight: 900,
          letterSpacing: "-0.03em",
          margin: "0 0 1.5rem",
          color: "var(--text-primary)",
        }}
      >
        THE ABRAXAS TRANSACTION
      </h2>

      <div className="abx-cinematic-transaction__flow">
        {STEPS.map((step, index) => (
          <motion.div
            key={step.label}
            className={`abx-cinematic-transaction__node ${index === 1 ? "abx-cinematic-transaction__node--gate" : ""}`}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration, delay: reduce ? 0 : index * 0.12 }}
          >
            <span className="abx-cinematic-transaction__node-label" style={{ fontFamily: MONO }}>
              {step.label}
            </span>
            <span className="abx-cinematic-transaction__node-detail" style={{ fontFamily: FONT }}>
              {step.detail}
            </span>
            {index < STEPS.length - 1 ? (
              <span className="abx-cinematic-transaction__arrow" aria-hidden="true">
                ↓
              </span>
            ) : null}
          </motion.div>
        ))}
      </div>

      <p
        style={{
          fontFamily: FONT,
          fontSize: "0.82rem",
          color: "var(--text-muted)",
          margin: "1.25rem auto 0",
          maxWidth: 480,
          lineHeight: 1.55,
        }}
      >
        Underlying evidence stays inside Abraxas. Only the approved answer crosses to the application.
      </p>
    </section>
  );
}
