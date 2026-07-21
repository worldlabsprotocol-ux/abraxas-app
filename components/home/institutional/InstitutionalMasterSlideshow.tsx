"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CosmicCornerGlow, CosmicParticleField } from "@/components/home/cinematic/CosmicDemoEffects";
import { PremiumMeshBg } from "@/components/home/cinematic/PremiumDemoPrimitives";
import { Btn } from "@/components/redesign/ui";
import { COSMIC_PALETTE, DEMO_MOTION, DEMO_TYPOGRAPHY } from "@/lib/demoDesignSystem";
import {
  INSTITUTIONAL_CHAPTERS,
  INSTITUTIONAL_MASTER_SLIDES,
  getChapterStartIndex,
  getSlideChapterIndex,
  type InstitutionalChapterId,
} from "@/lib/institutionalMasterSlides";
import { InstitutionalSlideVisual } from "./InstitutionalSlideVisual";

const ACCENT = COSMIC_PALETTE.cyan;
const TOTAL = INSTITUTIONAL_MASTER_SLIDES.length;

export function InstitutionalMasterSlideshow({ fullScreen = false }: { fullScreen?: boolean }) {
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const slide = INSTITUTIONAL_MASTER_SLIDES[index];
  const chapterIdx = getSlideChapterIndex(index);

  const go = useCallback((n: number) => {
    setIndex((n + TOTAL) % TOTAL);
  }, []);

  const goChapter = useCallback((chapterId: InstitutionalChapterId) => {
    setIndex(getChapterStartIndex(chapterId));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        go(index + 1);
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        go(index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);

  return (
    <div
      ref={containerRef}
      className="abx-institutional-slideshow"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: fullScreen ? 16 : 12,
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: fullScreen ? 16 : 12,
          width: "100%",
        }}
      >
      <NavButton direction="prev" onClick={() => go(index - 1)} large={fullScreen} className="abx-side-nav" />

      <div
        style={{
          flex: 1,
          position: "relative",
          minWidth: 0,
          aspectRatio: fullScreen ? "16 / 9" : "16 / 10",
          maxHeight: fullScreen ? "min(72vh, 640px)" : 480,
          borderRadius: fullScreen ? 28 : 24,
          border: `1px solid ${ACCENT}44`,
          overflow: "hidden",
          boxShadow: `0 40px 120px rgba(0,0,0,0.55), 0 0 80px ${ACCENT}12`,
        }}
      >
        <PremiumMeshBg mesh="ice" />
        <CosmicParticleField accent={ACCENT} count={fullScreen ? 22 : 16} />
        <CosmicCornerGlow color={ACCENT} />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding: fullScreen ? "clamp(1.25rem, 2.5vw, 1.75rem)" : "clamp(1rem, 2vw, 1.35rem)",
          }}
        >
          {/* Chapter rail */}
          <div
            role="tablist"
            aria-label="Slideshow chapters"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 12,
              justifyContent: "center",
            }}
          >
            {INSTITUTIONAL_CHAPTERS.map((ch, i) => {
              const active = i === chapterIdx;
              return (
                <button
                  key={ch.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => goChapter(ch.id)}
                  style={{
                    fontFamily: DEMO_TYPOGRAPHY.fontMono,
                    fontSize: "0.55rem",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: `1px solid ${active ? ACCENT : "rgba(255,255,255,0.12)"}`,
                    background: active ? `${ACCENT}22` : "rgba(0,0,0,0.3)",
                    color: active ? ACCENT : COSMIC_PALETTE.textMuted,
                    cursor: "pointer",
                    transition: "all 0.25s",
                  }}
                >
                  {ch.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: DEMO_TYPOGRAPHY.fontMono,
                fontSize: "0.55rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: ACCENT,
              }}
            >
              {slide.eyebrow}
            </span>
            <span style={{ fontFamily: DEMO_TYPOGRAPHY.fontMono, fontSize: "0.55rem", color: COSMIC_PALETTE.textMuted }}>
              {index + 1} / {TOTAL}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: DEMO_MOTION.easeOut }}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "0.5rem 0",
                minHeight: 0,
              }}
            >
              <h3
                style={{
                  fontFamily: DEMO_TYPOGRAPHY.fontSans,
                  fontSize: fullScreen ? "clamp(1.35rem, 3vw, 2rem)" : "clamp(1.15rem, 2.8vw, 1.55rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  color: COSMIC_PALETTE.textPrimary,
                  margin: "0.4rem 0 0.5rem",
                  maxWidth: 640,
                  lineHeight: 1.15,
                }}
              >
                {slide.title}
              </h3>
              {slide.subtitle && (
                <p
                  style={{
                    fontFamily: DEMO_TYPOGRAPHY.fontSans,
                    fontSize: "0.82rem",
                    lineHeight: 1.55,
                    color: COSMIC_PALETTE.textSecondary,
                    margin: "0 0 1rem",
                    maxWidth: 520,
                  }}
                >
                  {slide.subtitle}
                </p>
              )}
              <InstitutionalSlideVisual slide={slide} accent={ACCENT} />
            </motion.div>
          </AnimatePresence>

          {(slide.cta || slide.ctaSecondary) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 8 }}>
              {slide.cta && <Btn href={slide.cta.href} size="sm">{slide.cta.label} →</Btn>}
              {slide.ctaSecondary && (
                <Btn href={slide.ctaSecondary.href} variant="secondary" size="sm">
                  {slide.ctaSecondary.label} →
                </Btn>
              )}
            </div>
          )}

          {/* Bottom progress + dot rail */}
          <div style={{ marginTop: "auto", paddingTop: 12 }}>
            <div
              style={{
                height: 3,
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
                marginBottom: 10,
              }}
            >
              <motion.div
                key={slide.id}
                initial={{ width: `${(index / TOTAL) * 100}%` }}
                animate={{ width: `${((index + 1) / TOTAL) * 100}%` }}
                transition={{ duration: 0.35 }}
                style={{
                  height: "100%",
                  background: `linear-gradient(90deg, ${ACCENT}, ${COSMIC_PALETTE.violet})`,
                }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1 }}>
                {INSTITUTIONAL_MASTER_SLIDES.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`Slide ${i + 1}: ${s.title}`}
                    onClick={() => setIndex(i)}
                    style={{
                      width: i === index ? 18 : 6,
                      height: 6,
                      borderRadius: 999,
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      background: i === index ? ACCENT : "rgba(255,255,255,0.18)",
                      transition: "width 0.25s, background 0.25s",
                    }}
                  />
                ))}
              </div>
              <span style={{ fontFamily: DEMO_TYPOGRAPHY.fontMono, fontSize: "0.5rem", color: COSMIC_PALETTE.textMuted, flexShrink: 0 }}>
                ← → keys
              </span>
            </div>
          </div>
        </div>
      </div>

      <NavButton direction="next" onClick={() => go(index + 1)} large={fullScreen} className="abx-side-nav" />
      </div>

      <div className="abx-bottom-nav" style={{ width: "100%", justifyContent: "center", gap: 16 }}>
        <NavButton direction="prev" onClick={() => go(index - 1)} />
        <NavButton direction="next" onClick={() => go(index + 1)} />
      </div>
    </div>
  );
}

function NavButton({
  direction,
  onClick,
  large,
  className,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  large?: boolean;
  className?: string;
}) {
  const label = direction === "prev" ? "Previous slide" : "Next slide";
  const symbol = direction === "prev" ? "‹" : "›";
  const size = large ? 56 : 48;

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={className}
      style={{
        flexShrink: 0,
        alignSelf: "center",
        width: size,
        height: size * 1.4,
        borderRadius: 16,
        border: `1px solid ${ACCENT}55`,
        background: `linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0.75))`,
        color: "#FAFAFA",
        fontSize: large ? "2rem" : "1.6rem",
        fontWeight: 300,
        lineHeight: 1,
        cursor: "pointer",
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 24px ${ACCENT}22`,
        transition: "transform 0.2s, border-color 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = ACCENT;
        e.currentTarget.style.transform = "scale(1.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${ACCENT}55`;
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {symbol}
    </button>
  );
}
