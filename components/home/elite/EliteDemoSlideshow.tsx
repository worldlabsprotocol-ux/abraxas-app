"use client";
// FILE: components/home/elite/EliteDemoSlideshow.tsx
// Site-wide elite visual demo. cosmic frame, auto slides, minimal text.

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CosmicCornerGlow, CosmicParticleField } from "@/components/home/cinematic/CosmicDemoEffects";
import { PremiumMeshBg } from "@/components/home/cinematic/PremiumDemoPrimitives";
import { COSMIC_PALETTE, DEMO_MOTION, DEMO_TYPOGRAPHY } from "@/lib/demoDesignSystem";
import type { EliteDemoConfig } from "@/lib/eliteDemoSlides";
import { EliteSlideVisual } from "./EliteSlideVisual";

const ASPECT: Record<string, { ratio: string; maxH: number }> = {
  phone: { ratio: "9 / 16", maxH: 480 },
  wide: { ratio: "16 / 10", maxH: 320 },
  cinema: { ratio: "16 / 9", maxH: 380 },
};

export function EliteDemoSlideshow({
  config,
  compact = false,
}: {
  config: EliteDemoConfig;
  compact?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slides = config.slides;
  const slide = slides[index];
  const autoMs = config.autoMs ?? 4000;
  const aspect = ASPECT[config.aspect ?? "wide"];

  const go = useCallback(
    (n: number) => setIndex((n + slides.length) % slides.length),
    [slides.length],
  );

  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => go(index + 1), autoMs);
    return () => window.clearInterval(t);
  }, [index, paused, autoMs, go]);

  return (
    <div
      className="abx-elite-demo"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: config.aspect === "cinema" ? 1120 : 640,
        margin: "0 auto",
        aspectRatio: aspect.ratio,
        maxHeight: compact ? aspect.maxH * 0.85 : aspect.maxH,
        borderRadius: compact ? 20 : 24,
        border: `1px solid ${config.accent}44`,
        overflow: "hidden",
        boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 80px ${config.accent}14`,
      }}
    >
      <PremiumMeshBg mesh={config.mesh} />
      <CosmicParticleField accent={config.accent} count={compact ? 12 : 18} />
      <CosmicCornerGlow color={config.accent} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: compact ? "1rem 1.1rem" : "clamp(1.1rem, 2.5vw, 1.5rem)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={microStyle(config.accent)}>{slide.label}</span>
          <span style={{ ...microStyle(COSMIC_PALETTE.textMuted), color: COSMIC_PALETTE.textMuted }}>
            {index + 1}/{slides.length}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: DEMO_MOTION.easeOut }}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}
          >
            <h3
              style={{
                fontFamily: DEMO_TYPOGRAPHY.fontSans,
                fontSize: compact ? "clamp(1.1rem, 3vw, 1.4rem)" : "clamp(1.25rem, 3.5vw, 1.75rem)",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                color: COSMIC_PALETTE.textPrimary,
                margin: "0.35rem 0 0.5rem",
                textShadow: `0 0 40px ${config.accent}33`,
              }}
            >
              {slide.headline}
            </h3>
            {slide.micro && (
              <p style={{ fontFamily: DEMO_TYPOGRAPHY.fontMono, fontSize: "0.58rem", color: config.accent, margin: "0 0 0.75rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {slide.micro}
              </p>
            )}
            <EliteSlideVisual slide={slide} accent={config.accent} />
          </motion.div>
        </AnimatePresence>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setIndex(i)}
                style={{
                  width: i === index ? 20 : 7,
                  height: 7,
                  borderRadius: 999,
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  background: i === index ? config.accent : "rgba(255,255,255,0.2)",
                  transition: "width 0.3s",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={() => go(index - 1)} aria-label="Previous" style={navBtn}>←</button>
            <button type="button" onClick={() => go(index + 1)} aria-label="Next" style={navBtn}>→</button>
          </div>
        </div>

        {!paused && (
          <motion.div
            key={`${slide.id}-bar`}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: autoMs / 1000, ease: "linear" }}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              height: 2,
              background: `linear-gradient(90deg, ${config.accent}, ${COSMIC_PALETTE.violet})`,
              boxShadow: `0 0 12px ${config.accent}66`,
            }}
          />
        )}
      </div>
    </div>
  );
}

function microStyle(color: string): React.CSSProperties {
  return {
    fontFamily: DEMO_TYPOGRAPHY.fontMono,
    fontSize: "0.55rem",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color,
  };
}

const navBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.35)",
  color: "#FAFAFA",
  cursor: "pointer",
  fontWeight: 700,
};
