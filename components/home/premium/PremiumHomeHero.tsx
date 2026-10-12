"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Btn } from "@/components/redesign/ui";
import { CinematicHomeHeroVisual } from "@/components/home/CinematicHomeHeroVisual";
import {
  CINEMATIC_HOME_CTA_PRIMARY,
  CINEMATIC_HOME_CTA_PRIMARY_HREF,
  CINEMATIC_HOME_CTA_SECONDARY,
  CINEMATIC_HOME_CTA_SECONDARY_HREF,
  CINEMATIC_HOME_HEADLINE,
  CINEMATIC_HOME_LEAD,
} from "@/lib/home/cinematicHomeCopy";
const HEADLINE_LINES = ["Prove what matters.", "Keep what's yours."];
const REVEAL_EASE = [0.22, 1, 0.36, 1] as const;

export function PremiumHomeHero() {
  const reduceMotion = useReducedMotion();

  const visual = {
    initial: reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.94 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: reduceMotion ? 0 : 0.85, ease: REVEAL_EASE },
  };

  const line = (delay: number) => ({
    initial: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.72, delay, ease: REVEAL_EASE },
  });

  return (
    <header className="abx-premium-hero" aria-label="Abraxas — prove what matters">
      <div className="abx-premium-hero__grid" aria-hidden="true" />
      <div className="abx-premium-hero__layout">
        <div className="abx-premium-hero__copy">
          <motion.p className="abx-v2-eyebrow abx-premium-hero__eyebrow" {...line(0.05)}>
            Independent verification
          </motion.p>
          <h1 className="abx-premium-hero__title">
            {HEADLINE_LINES.map((text, i) => (
              <span key={text} className="abx-premium-hero__title-line">
                <motion.span className="abx-premium-hero__title-inner" {...line(0.12 + i * 0.08)}>
                  {text}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p className="abx-premium-hero__lead" {...line(0.32)}>
            {CINEMATIC_HOME_LEAD}
          </motion.p>
          <motion.div className="abx-premium-hero__actions" {...line(0.48)}>
            <Btn href={CINEMATIC_HOME_CTA_PRIMARY_HREF} size="md">
              {CINEMATIC_HOME_CTA_PRIMARY}
            </Btn>
            <Btn href={CINEMATIC_HOME_CTA_SECONDARY_HREF} variant="secondary" size="md">
              {CINEMATIC_HOME_CTA_SECONDARY}
            </Btn>
          </motion.div>
          <p className="abx-premium-hero__sr-only">{CINEMATIC_HOME_HEADLINE}</p>
        </div>
        <motion.div className="abx-premium-hero__visual-wrap" {...visual}>
          <CinematicHomeHeroVisual />
        </motion.div>
      </div>
      <div className="abx-premium-hero__baseline" aria-hidden="true" />
    </header>
  );
}
