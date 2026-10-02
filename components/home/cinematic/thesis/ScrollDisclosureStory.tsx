"use client";
// FILE: components/home/cinematic/thesis/ScrollDisclosureStory.tsx
// Sticky scroll-driven selective disclosure — private evidence contracts to a narrow answer.

import { motion } from "framer-motion";
import { DataRedactionText } from "@/lib/motion/cinematic/DataRedactionText";
import { useCinematicNarrativeProgress } from "@/lib/motion/cinematic/useCinematicNarrativeProgress";
import { ABX_FONT_DISPLAY, ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import { abxMotionTransition } from "@/lib/motion/abxMotionFramer";
import {
  SCROLL_STORY_CLOSE,
  SCROLL_STORY_EYEBROW,
  SCROLL_STORY_RESOLVE,
  SYNTHETIC_IDENTITY_FIELDS,
} from "@/lib/home/cinematicHomeCopy";

const FONT = ABX_FONT_SANS;
const DISPLAY = ABX_FONT_DISPLAY;

export function ScrollDisclosureStory() {
  const { ref, progress: effectiveProgress, isStatic } = useCinematicNarrativeProgress();

  const vaultScale = isStatic ? 1 : 1 - effectiveProgress * 0.05;
  const veilHeight = isStatic ? "0%" : `${Math.min(100, effectiveProgress * 110)}%`;

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      aria-labelledby="scroll-disclosure-heading"
      className="abx-cinematic-story abx-cinematic-story--sticky abx-home-section-center"
      data-scroll-progress={effectiveProgress.toFixed(2)}
    >
      <div className="abx-cinematic-story__sticky">
        <p className="abx-cinematic-story__eyebrow">{SCROLL_STORY_EYEBROW}</p>
        <h2 id="scroll-disclosure-heading" className="sr-only">
          How selective disclosure works
        </h2>

        <div className="abx-cinematic-story__grid abx-cinematic-story__grid--vault">
          <div
            className="abx-cinematic-story__vault"
            style={{
              transform: `scale(${vaultScale})`,
            }}
          >
            <div className="abx-cinematic-story__vault-label" aria-hidden>
              Private evidence space
            </div>
            <div className="abx-cinematic-story__vault-veil" style={{ height: veilHeight }} aria-hidden />
            <div className="abx-cinematic-story__panel">
              <DataRedactionText
                fields={SYNTHETIC_IDENTITY_FIELDS}
                progress={effectiveProgress}
                resolvedLabel={effectiveProgress > 0.58 ? "21+ VERIFIED" : undefined}
              />
            </div>
          </div>

          <div className="abx-cinematic-story__statements">
            {effectiveProgress < 0.42 ? (
              <p className="abx-cinematic-story__statement" style={{ fontFamily: FONT }}>
                Synthetic identity fields — demonstration only.
              </p>
            ) : null}
            {effectiveProgress >= 0.42 && effectiveProgress < 0.72 ? (
              <motion.p
                key="resolve"
                initial={isStatic ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={abxMotionTransition("verify", { tier: "cinematic" })}
                className="abx-cinematic-story__statement abx-cinematic-story__statement--resolve"
                style={{ fontFamily: DISPLAY }}
              >
                {SCROLL_STORY_RESOLVE}
              </motion.p>
            ) : null}
            {effectiveProgress >= 0.72 ? (
              <motion.p
                key="close"
                initial={isStatic ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={abxMotionTransition("verify", { tier: "cinematic" })}
                className="abx-cinematic-story__statement abx-cinematic-story__statement--close"
                style={{ fontFamily: DISPLAY }}
              >
                {SCROLL_STORY_CLOSE}
              </motion.p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
