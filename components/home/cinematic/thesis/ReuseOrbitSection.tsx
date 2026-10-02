"use client";
// FILE: components/home/cinematic/thesis/ReuseOrbitSection.tsx
// One verified fact → multiple authorized asks. Scroll-drawn connections, not a spinner.

import { motion, useReducedMotion } from "framer-motion";
import { useStickyScrollProgress } from "@/lib/motion/cinematic/useStickyScrollProgress";
import { ABX_FONT_DISPLAY, ABX_FONT_MONO, ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import { abxMotionTransition } from "@/lib/motion/abxMotionFramer";
import { REUSE_ORBIT_ASKS, REUSE_ORBIT_DISCLAIMER, REUSE_ORBIT_HEADLINE } from "@/lib/home/cinematicHomeCopy";

const FONT = ABX_FONT_SANS;
const DISPLAY = ABX_FONT_DISPLAY;

const SPOKE_ANGLES = REUSE_ORBIT_ASKS.map((_, i) => -90 + (360 / REUSE_ORBIT_ASKS.length) * i);

export function ReuseOrbitSection() {
  const reduce = useReducedMotion();
  const { ref, progress } = useStickyScrollProgress(140);
  const effective = reduce ? 1 : progress;

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      aria-labelledby="reuse-orbit-heading"
      className="abx-cinematic-orbit abx-cinematic-orbit--sticky abx-home-section-center"
    >
      <div className="abx-cinematic-orbit__sticky">
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

        <div className="abx-cinematic-orbit__canvas abx-cinematic-orbit__canvas--hub">
          <svg className="abx-cinematic-orbit__spokes" viewBox="0 0 520 320" aria-hidden="true">
            {SPOKE_ANGLES.map((angle, index) => {
              const rad = (angle * Math.PI) / 180;
              const cx = 260;
              const cy = 160;
              const x2 = cx + Math.cos(rad) * 118;
              const y2 = cy + Math.sin(rad) * 88;
              const drawProgress = Math.min(1, Math.max(0, (effective - index * 0.12) * 1.4));
              const length = Math.hypot(x2 - cx, y2 - cy);
              return (
                <line
                  key={REUSE_ORBIT_ASKS[index]}
                  x1={cx}
                  y1={cy}
                  x2={x2}
                  y2={y2}
                  className="abx-cinematic-orbit__spoke-line"
                  strokeDasharray={length}
                  strokeDashoffset={length * (1 - drawProgress)}
                />
              );
            })}
          </svg>

          <motion.div
            className="abx-cinematic-orbit__core abx-cinematic-orbit__core--fact"
            style={{ fontFamily: ABX_FONT_MONO }}
            animate={
              reduce
                ? undefined
                : {
                    scale: 0.96 + effective * 0.04,
                    boxShadow:
                      effective > 0.5
                        ? "0 0 0 1px rgba(45,212,191,0.35), 0 12px 40px rgba(0,0,0,0.35)"
                        : "0 0 0 1px rgba(232,197,71,0.25)",
                  }
            }
            transition={abxMotionTransition("verify", { tier: "cinematic" })}
          >
            {effective < 0.35 ? "ONE VERIFIED FACT" : "REUSABLE CREDENTIAL"}
          </motion.div>

          <div className="abx-cinematic-orbit__ring abx-cinematic-orbit__ring--hub" aria-hidden="true">
            {REUSE_ORBIT_ASKS.map((ask, index) => {
              const visible = effective > 0.2 + index * 0.1;
              return (
                <motion.span
                  key={ask}
                  className="abx-cinematic-orbit__ask abx-cinematic-orbit__ask--hub"
                  style={{
                    fontFamily: FONT,
                    ["--orbit-i" as string]: index,
                    ["--orbit-angle" as string]: `${SPOKE_ANGLES[index]}deg`,
                  }}
                  initial={false}
                  animate={{
                    opacity: visible ? 1 : 0.35,
                    scale: visible ? 1 : 0.94,
                  }}
                  transition={abxMotionTransition("micro", { tier: "cinematic" })}
                >
                  {ask}
                </motion.span>
              );
            })}
          </div>
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
      </div>
    </section>
  );
}
