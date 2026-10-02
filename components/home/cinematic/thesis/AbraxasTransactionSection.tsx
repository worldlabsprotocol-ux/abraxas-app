"use client";
// FILE: components/home/cinematic/thesis/AbraxasTransactionSection.tsx
// Application → Abraxas → signed result — directional handoff on scroll.

import { motion } from "framer-motion";
import { useCinematicNarrativeProgress } from "@/lib/motion/cinematic/useCinematicNarrativeProgress";
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

/** Single active node per scroll window — avoids three competing highlights. */
function stepFocus(progress: number, index: number): number {
  const centers = [0.18, 0.5, 0.82];
  const width = 0.22;
  const distance = Math.abs(progress - centers[index]);
  return Math.max(0, 1 - distance / width);
}

export function AbraxasTransactionSection() {
  const { ref, progress: effective, isStatic } = useCinematicNarrativeProgress(120);

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      aria-labelledby="abraxas-transaction-heading"
      className="abx-cinematic-transaction abx-cinematic-transaction--sticky abx-home-section-center"
      data-scroll-progress={effective.toFixed(2)}
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
            const focus = isStatic ? (index === 2 ? 1 : 0.35) : stepFocus(effective, index);
            const active = focus > 0.55;
            return (
              <div
                key={step.label}
                className={`abx-cinematic-transaction__node ${index === 1 ? "abx-cinematic-transaction__node--gate" : ""} ${active ? "abx-cinematic-transaction__node--active" : ""}`}
                style={{
                  opacity: 0.38 + focus * 0.62,
                  transform: `translateY(${(1 - focus) * 8}px) scale(${0.98 + focus * 0.02})`,
                  transition: isStatic ? "none" : "opacity 180ms ease-out, transform 180ms ease-out",
                }}
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
                    style={{ opacity: Math.min(1, focus * 0.85 + 0.15) }}
                  >
                    →
                  </span>
                ) : null}
              </div>
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
          animate={{ opacity: isStatic ? 1 : 0.45 + effective * 0.55 }}
          transition={abxMotionTransition("surface", { tier: "cinematic" })}
        >
          Underlying evidence stays inside Abraxas. Only the approved answer crosses to the application.
        </motion.p>
      </div>
    </section>
  );
}
