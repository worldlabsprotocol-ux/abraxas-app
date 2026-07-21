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
  const isEmbed = slide.layout === "embed";
  const canvasMinH = fullScreen ? (isEmbed ? 480 : 400) : isEmbed ? 400 : 320;

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
        gap: fullScreen ? 20 : 16,
        width: "100%",
      }}
    >
      {/* ── Control deck: all navigation + copy lives ABOVE the slide ── */}
      <div className="abx-slideshow-control-deck" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          role="tablist"
          aria-label="Slideshow chapters"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
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
                  fontSize: "0.58rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: `1px solid ${active ? ACCENT : "rgba(255,255,255,0.12)"}`,
                  background: active ? `${ACCENT}18` : "rgba(0,0,0,0.25)",
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

        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: DEMO_MOTION.easeOut }}
            style={{ textAlign: "center", padding: "0 0.5rem" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 12,
                marginBottom: 8,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontFamily: DEMO_TYPOGRAPHY.fontMono,
                  fontSize: "0.58rem",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: ACCENT,
                }}
              >
                {slide.eyebrow}
              </span>
              <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
              <span style={{ fontFamily: DEMO_TYPOGRAPHY.fontMono, fontSize: "0.58rem", color: COSMIC_PALETTE.textMuted }}>
                {index + 1} / {TOTAL}
              </span>
            </div>

            <h3
              style={{
                fontFamily: DEMO_TYPOGRAPHY.fontSans,
                fontSize: fullScreen ? "clamp(1.25rem, 2.5vw, 1.65rem)" : "clamp(1.1rem, 2.4vw, 1.4rem)",
                fontWeight: 900,
                letterSpacing: "-0.04em",
                color: COSMIC_PALETTE.textPrimary,
                margin: "0 0 0.4rem",
                maxWidth: 640,
                marginLeft: "auto",
                marginRight: "auto",
                lineHeight: 1.2,
              }}
            >
              {slide.title}
            </h3>

            {slide.subtitle && (
              <p
                style={{
                  fontFamily: DEMO_TYPOGRAPHY.fontSans,
                  fontSize: "0.84rem",
                  lineHeight: 1.6,
                  color: COSMIC_PALETTE.textSecondary,
                  margin: "0 auto",
                  maxWidth: 520,
                }}
              >
                {slide.subtitle}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 480, margin: "0 auto", width: "100%" }}>
          <div
            style={{
              flex: 1,
              height: 4,
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              overflow: "hidden",
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
          <span
            style={{
              fontFamily: DEMO_TYPOGRAPHY.fontMono,
              fontSize: "0.5rem",
              color: COSMIC_PALETTE.textMuted,
              flexShrink: 0,
            }}
          >
            ← →
          </span>
        </div>
      </div>

      {/* ── Slide canvas: visual only, centered ── */}
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
            minHeight: canvasMinH,
            borderRadius: fullScreen ? 28 : 24,
            border: `1px solid ${ACCENT}33`,
            overflow: "hidden",
            boxShadow: `0 32px 80px rgba(0,0,0,0.45), 0 0 60px ${ACCENT}0c`,
          }}
        >
          <PremiumMeshBg mesh="ice" />
          <CosmicParticleField accent={ACCENT} count={fullScreen ? 18 : 12} />
          <CosmicCornerGlow color={ACCENT} />

          <div
            style={{
              position: "relative",
              zIndex: 2,
              height: "100%",
              minHeight: canvasMinH,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: fullScreen ? "1.5rem 1.75rem" : "1.25rem 1.5rem",
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.35, ease: DEMO_MOTION.easeOut }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <InstitutionalSlideVisual slide={slide} accent={ACCENT} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <NavButton direction="next" onClick={() => go(index + 1)} large={fullScreen} className="abx-side-nav" />
      </div>

      {(slide.cta || slide.ctaSecondary) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", paddingTop: 4 }}>
          {slide.cta && <Btn href={slide.cta.href} size="sm">{slide.cta.label} →</Btn>}
          {slide.ctaSecondary && (
            <Btn href={slide.ctaSecondary.href} variant="secondary" size="sm">
              {slide.ctaSecondary.label} →
            </Btn>
          )}
        </div>
      )}

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
  const size = large ? 52 : 44;

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
        height: size * 1.35,
        borderRadius: 14,
        border: `1px solid ${ACCENT}44`,
        background: "rgba(0,0,0,0.4)",
        color: "#FAFAFA",
        fontSize: large ? "1.75rem" : "1.45rem",
        fontWeight: 300,
        lineHeight: 1,
        cursor: "pointer",
        transition: "transform 0.2s, border-color 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = ACCENT;
        e.currentTarget.style.transform = "scale(1.04)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${ACCENT}44`;
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {symbol}
    </button>
  );
}
