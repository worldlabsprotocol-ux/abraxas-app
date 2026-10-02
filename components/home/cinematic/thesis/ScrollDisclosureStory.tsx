"use client";
// FILE: components/home/cinematic/thesis/ScrollDisclosureStory.tsx
// Scroll-driven selective disclosure narrative.

import { motion, useReducedMotion } from "framer-motion";
import { DataRedactionText } from "@/lib/motion/cinematic/DataRedactionText";
import { useScrollSectionProgress } from "@/lib/motion/cinematic/useScrollSectionProgress";
import { ABX_FONT_DISPLAY, ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import {
  SCROLL_STORY_CLOSE,
  SCROLL_STORY_EYEBROW,
  SCROLL_STORY_RESOLVE,
  SYNTHETIC_IDENTITY_FIELDS,
} from "@/lib/home/cinematicHomeCopy";

const FONT = ABX_FONT_SANS;
const DISPLAY = ABX_FONT_DISPLAY;

export function ScrollDisclosureStory() {
  const reduce = useReducedMotion();
  const { ref, progress } = useScrollSectionProgress(8);
  const effectiveProgress = reduce ? 1 : progress;

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      aria-labelledby="scroll-disclosure-heading"
      className="abx-cinematic-story abx-home-section-center"
    >
      <p className="abx-cinematic-story__eyebrow">{SCROLL_STORY_EYEBROW}</p>
      <h2
        id="scroll-disclosure-heading"
        className="sr-only"
      >
        How selective disclosure works
      </h2>

      <div className="abx-cinematic-story__grid">
        <div className="abx-cinematic-story__panel">
          <DataRedactionText
            fields={SYNTHETIC_IDENTITY_FIELDS}
            progress={effectiveProgress}
            resolvedLabel={effectiveProgress > 0.65 ? "21+ VERIFIED" : undefined}
          />
        </div>

        <div className="abx-cinematic-story__statements">
          {effectiveProgress < 0.55 ? (
            <p className="abx-cinematic-story__statement" style={{ fontFamily: FONT }}>
              Synthetic identity fields — demonstration only.
            </p>
          ) : null}
          {effectiveProgress >= 0.55 && effectiveProgress < 0.85 ? (
            <motion.p
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="abx-cinematic-story__statement abx-cinematic-story__statement--resolve"
              style={{ fontFamily: DISPLAY }}
            >
              {SCROLL_STORY_RESOLVE}
            </motion.p>
          ) : null}
          {effectiveProgress >= 0.85 ? (
            <motion.p
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="abx-cinematic-story__statement abx-cinematic-story__statement--close"
              style={{ fontFamily: DISPLAY }}
            >
              {SCROLL_STORY_CLOSE}
            </motion.p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
