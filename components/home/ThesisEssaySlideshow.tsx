"use client";
// FILE: components/home/ThesisEssaySlideshow.tsx
// Compact slideshow — full RWA essay without lengthening the homepage.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Btn } from "@/components/redesign/ui";
import { CosmicCornerGlow, CosmicParticleField } from "@/components/home/cinematic/CosmicDemoEffects";
import { ACCENT, CONCEPT_TYPE, PREMIUM_FONT, PREMIUM_MONO } from "@/components/home/cinematic/demoPremium";
import { COSMIC_PALETTE, DEMO_MOTION } from "@/lib/demoDesignSystem";
import {
  RWA_INSTITUTION_QUESTIONS,
  RWA_THESIS_MARKET_STATS,
  RWA_THESIS_MEDIUM_URL,
  RWA_THESIS_SLIDES,
  RWA_THESIS_SLUG,
  RWA_TOKENIZATION_STEPS,
  type RwaThesisSlide,
} from "@/lib/rwaTokenizationThesis";

const AUTO_MS = 7500;

function SlideVisual({ slide }: { slide: RwaThesisSlide }) {
  switch (slide.visual) {
    case "market":
      return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12 }}>
          {RWA_THESIS_MARKET_STATS.map(s => (
            <div
              key={s.label}
              style={{
                padding: "10px 8px",
                borderRadius: 12,
                border: `1px solid ${COSMIC_PALETTE.glassBorder}`,
                background: "rgba(0,0,0,0.25)",
                textAlign: "center",
              }}
            >
              <div style={{ fontFamily: PREMIUM_MONO, fontSize: CONCEPT_TYPE.monoSm, color: COSMIC_PALETTE.textMuted }}>
                {s.label}
              </div>
              <div style={{ fontFamily: PREMIUM_FONT, fontSize: CONCEPT_TYPE.title, fontWeight: 900, color: COSMIC_PALETTE.gold }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      );
    case "steps":
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {RWA_TOKENIZATION_STEPS.map(s => (
            <span
              key={s.step}
              style={{
                fontFamily: PREMIUM_MONO,
                fontSize: CONCEPT_TYPE.monoSm,
                padding: "4px 8px",
                borderRadius: 999,
                border: `1px solid ${ACCENT.gold}44`,
                color: COSMIC_PALETTE.textSecondary,
                background: `${ACCENT.gold}12`,
              }}
            >
              {s.step} {s.title}
            </span>
          ))}
        </div>
      );
    case "gap":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
          {RWA_INSTITUTION_QUESTIONS.map(q => (
            <div
              key={q}
              style={{
                fontFamily: PREMIUM_FONT,
                fontSize: CONCEPT_TYPE.sub,
                color: COSMIC_PALETTE.textSecondary,
                padding: "6px 10px",
                borderRadius: 8,
                borderLeft: `2px solid ${ACCENT.rose}`,
                background: "rgba(244,114,182,0.06)",
              }}
            >
              {q}
            </div>
          ))}
        </div>
      );
    case "examples":
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {["BlackRock BUIDL", "Private credit", "Cielo Sunrise", "Chickasaw"].map(ex => (
            <span
              key={ex}
              style={{
                fontFamily: PREMIUM_FONT,
                fontSize: CONCEPT_TYPE.sub,
                fontWeight: 700,
                padding: "6px 12px",
                borderRadius: 10,
                border: `1px solid ${ACCENT.emerald}55`,
                color: ACCENT.emerald,
                background: `${ACCENT.emerald}10`,
              }}
            >
              {ex}
            </span>
          ))}
        </div>
      );
    case "abraxas":
      return (
        <div
          style={{
            marginTop: 14,
            padding: "14px 16px",
            borderRadius: 14,
            border: `1px solid ${ACCENT.emerald}55`,
            background: `linear-gradient(135deg, ${ACCENT.emerald}14, transparent)`,
            textAlign: "center",
          }}
        >
          <div style={{ fontFamily: PREMIUM_MONO, fontSize: CONCEPT_TYPE.label, color: ACCENT.emerald, letterSpacing: "0.12em" }}>
            VERIFY LAYER
          </div>
          <div style={{ fontFamily: PREMIUM_FONT, fontSize: CONCEPT_TYPE.hero, fontWeight: 900, color: COSMIC_PALETTE.textPrimary }}>
            Abraxas Passport
          </div>
          <div style={{ fontFamily: PREMIUM_MONO, fontSize: CONCEPT_TYPE.monoSm, color: COSMIC_PALETTE.textMuted, marginTop: 4 }}>
            agent.proceed · agent.valid · W3C VC
          </div>
        </div>
      );
    default:
      return (
        <div
          style={{
            marginTop: 12,
            padding: "12px 14px",
            borderRadius: 12,
            border: `1px solid ${ACCENT.violet}44`,
            background: `${ACCENT.violet}0c`,
            fontFamily: PREMIUM_MONO,
            fontSize: CONCEPT_TYPE.mono,
            color: ACCENT.violet,
          }}
        >
          On-chain ownership · off-chain asset · shared audit trail
        </div>
      );
  }
}

export function ThesisEssaySlideshow() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = RWA_THESIS_SLIDES.length;
  const slide = RWA_THESIS_SLIDES[index];

  const go = useCallback((next: number) => {
    setIndex((next + total) % total);
  }, [total]);

  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => go(index + 1), AUTO_MS);
    return () => window.clearInterval(t);
  }, [index, paused, go]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      style={{
        position: "relative",
        borderRadius: 20,
        border: `1px solid ${COSMIC_PALETTE.glassBorder}`,
        background: COSMIC_PALETTE.glassBg,
        backdropFilter: "blur(20px)",
        overflow: "hidden",
        boxShadow: "0 32px 100px rgba(0,0,0,0.5)",
        minHeight: 280,
      }}
    >
      <CosmicParticleField accent={ACCENT.violet} count={14} />
      <CosmicCornerGlow color={ACCENT.gold} />

      <div style={{ position: "relative", zIndex: 1, padding: "clamp(1rem, 2.5vw, 1.35rem)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 }}>
          <span style={{ fontFamily: PREMIUM_MONO, fontSize: CONCEPT_TYPE.monoSm, color: ACCENT.gold, fontWeight: 700, letterSpacing: "0.1em" }}>
            {slide.label}
          </span>
          <span style={{ fontFamily: PREMIUM_MONO, fontSize: CONCEPT_TYPE.monoSm, color: COSMIC_PALETTE.textMuted }}>
            {index + 1} / {total}
          </span>
        </div>

        <div style={{ position: "relative", minHeight: 160 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.45, ease: DEMO_MOTION.easeOut }}
            >
              <h3
                style={{
                  fontFamily: PREMIUM_FONT,
                  fontSize: "clamp(1rem, 2.6vw, 1.28rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.2,
                  color: COSMIC_PALETTE.textPrimary,
                  margin: "0 0 0.5rem",
                }}
              >
                {slide.headline}
              </h3>
              <p
                style={{
                  fontFamily: PREMIUM_FONT,
                  fontSize: CONCEPT_TYPE.body,
                  lineHeight: 1.6,
                  color: COSMIC_PALETTE.textSecondary,
                  margin: 0,
                  maxWidth: 640,
                }}
              >
                {slide.body}
              </p>
              <SlideVisual slide={slide} />
            </motion.div>
          </AnimatePresence>
        </div>

        {slide.id === "abraxas" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}
          >
            <Btn href={`/blog/${RWA_THESIS_SLUG}`} size="sm">Full article →</Btn>
            <Btn href={RWA_THESIS_MEDIUM_URL} variant="secondary" size="sm">Medium →</Btn>
            <Link href="/integrate" style={{ fontFamily: PREMIUM_FONT, fontSize: "0.74rem", fontWeight: 700, color: ACCENT.emerald, alignSelf: "center", textDecoration: "none" }}>
              Integrate →
            </Link>
          </motion.div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, gap: 12 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {RWA_THESIS_SLIDES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                style={{
                  width: i === index ? 22 : 8,
                  height: 8,
                  borderRadius: 999,
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  background: i === index ? ACCENT.gold : "rgba(255,255,255,0.2)",
                  transition: "width 0.3s ease",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous slide"
              style={navBtn}
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next slide"
              style={navBtn}
            >
              →
            </button>
          </div>
        </div>

        <motion.div
          style={{ height: 2, marginTop: 12, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}
        >
          {!paused && (
            <motion.div
              key={`${slide.id}-${index}`}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: AUTO_MS / 1000, ease: "linear" }}
              style={{ height: "100%", background: `linear-gradient(90deg, ${ACCENT.gold}, ${ACCENT.violet})` }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  fontFamily: PREMIUM_FONT,
  fontSize: "0.85rem",
  fontWeight: 700,
  width: 36,
  height: 36,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.35)",
  color: "#FAFAFA",
  cursor: "pointer",
};
