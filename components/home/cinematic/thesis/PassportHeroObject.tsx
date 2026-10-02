"use client";
// FILE: components/home/cinematic/thesis/PassportHeroObject.tsx
// Living eligibility object — demo state only, not government ID.

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ABX_FONT_DISPLAY, ABX_FONT_MONO, ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
import {
  PASSPORT_HERO_ELIGIBILITY,
  PASSPORT_HERO_LABEL,
  PASSPORT_HERO_SHARED,
  PASSPORT_HERO_STATE,
} from "@/lib/home/cinematicHomeCopy";

const FONT = ABX_FONT_SANS;
const DISPLAY = ABX_FONT_DISPLAY;
const MONO = ABX_FONT_MONO;

export function PassportHeroObject() {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 120, damping: 18 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 120, damping: 18 });

  function onMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reduce) return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left) / rect.width - 0.5);
    y.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <section aria-labelledby="passport-hero-heading" className="abx-cinematic-passport abx-home-section-center">
      <h2 id="passport-hero-heading" className="sr-only">
        Abraxas Passport
      </h2>
      <p
        style={{
          fontFamily: DISPLAY,
          fontSize: "clamp(1.15rem, 3vw, 1.55rem)",
          fontWeight: 900,
          letterSpacing: "-0.03em",
          margin: "0 0 1.25rem",
          color: "var(--text-primary)",
        }}
      >
        YOUR PASSPORT KNOWS MORE THAN PARTNERS RECEIVE
      </p>

      <motion.div
        className="abx-cinematic-passport__object"
        style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        initial={reduce ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="abx-cinematic-passport__glow" aria-hidden />
        <p className="abx-cinematic-passport__label" style={{ fontFamily: MONO }}>
          {PASSPORT_HERO_LABEL}
        </p>
        <p className="abx-cinematic-passport__state" style={{ fontFamily: MONO }}>
          {PASSPORT_HERO_STATE}
        </p>
        <div className="abx-cinematic-passport__divider" aria-hidden />
        <p className="abx-cinematic-passport__field-label" style={{ fontFamily: MONO }}>
          ELIGIBILITY
        </p>
        <p className="abx-cinematic-passport__field-value" style={{ fontFamily: DISPLAY }}>
          {PASSPORT_HERO_ELIGIBILITY}
        </p>
        <p className="abx-cinematic-passport__shared" style={{ fontFamily: FONT }}>
          {PASSPORT_HERO_SHARED}
        </p>
      </motion.div>

      <p
        style={{
          fontFamily: FONT,
          fontSize: "0.78rem",
          color: "var(--text-muted)",
          margin: "1rem auto 0",
          maxWidth: 420,
        }}
      >
        Demo presentation — assurance level and evidence come from authoritative policy evaluation, not decorative UI.
      </p>
    </section>
  );
}
