"use client";
// FILE: components/home/cinematic/thesis/AbraxasTransactionSection.tsx
// Application → Abraxas → signed result — directional handoff on scroll.

import { motion, useReducedMotion } from "framer-motion";
import { useStickyScrollProgress } from "@/lib/motion/cinematic/useStickyScrollProgress";
import { ABX_FONT_DISPLAY, ABX_FONT_MONO, ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import { abxMotionTransition } from "@/lib/motion/abxMotionFramer";
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
  const { ref, progress } = useStickyScrollProgress(120);
  const effective = reduce ? 1 : progress;

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      aria-labelledby="abraxas-transaction-heading"
      className="abx-cinematic-transaction abx-cinematic-transaction--sticky abx-home-section-center"
    >
      <div className="abx-cinematic-transaction__sticky">
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

        <div className="abx-cinematic-transaction__flow abx-cinematic-transaction__flow--horizontal">
          {STEPS.map((step, index) => {
            const stepProgress = Math.min(1, Math.max(0, (effective - index * 0.28) * 2.2));
            const active = stepProgress > 0.35;
            return (
              <motion.div
                key={step.label}
                className={`abx-cinematic-transaction__node ${index === 1 ? "abx-cinematic-transaction__node--gate" : ""} ${active ? "abx-cinematic-transaction__node--active" : ""}`}
                animate={
                  reduce
                    ? undefined
                    : {
                        opacity: 0.45 + stepProgress * 0.55,
                        y: (1 - stepProgress) * 10,
                        scale: 0.97 + stepProgress * 0.03,
                      }
                }
                transition={abxMotionTransition("transfer", { tier: "cinematic" })}
              >
                <span className="abx-cinematic-transaction__node-label" style={{ fontFamily: MONO }}>
                  {step.label}
                </span>
                <span className="abx-cinematic-transaction__node-detail" style={{ fontFamily: FONT }}>
                  {step.detail}
                </span>
                {index < STEPS.length - 1 ? (
                  <span
                    className="abx-cinematic-transaction__arrow abx-cinematic-transaction__arrow--forward"
                    aria-hidden="true"
                    style={{ opacity: Math.min(1, stepProgress + 0.2) }}
                  >
                    →
                  </span>
                ) : null}
              </motion.div>
            );
          })}
        </div>

        <motion.p
          style={{
            fontFamily: FONT,
            fontSize: "0.82rem",
            color: "var(--text-muted)",
            margin: "1.25rem auto 0",
            maxWidth: 480,
            lineHeight: 1.55,
          }}
          animate={{ opacity: reduce ? 1 : 0.4 + effective * 0.6 }}
          transition={abxMotionTransition("surface", { tier: "cinematic" })}
        >
          Underlying evidence stays inside Abraxas. Only the approved answer crosses to the application.
        </motion.p>
      </div>
    </section>
  );
}
