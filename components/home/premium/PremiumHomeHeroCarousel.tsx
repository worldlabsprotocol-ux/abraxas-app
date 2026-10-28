"use client";
// FILE: components/home/premium/PremiumHomeHeroCarousel.tsx
// Two-slide hero: brand introduction + full protocol architecture diagram.

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type TouchEvent,
} from "react";
import {
  CINEMATIC_HOME_CTA_PRIMARY,
  CINEMATIC_HOME_CTA_PRIMARY_HREF,
} from "@/lib/home/cinematicHomeCopy";
import { PremiumHomeHero } from "@/components/home/premium/PremiumHomeHero";
import { HomeTrustContinuousArchitectureImage } from "@/components/home/HomeTrustContinuousArchitectureImage";
import { useReducedMotion } from "framer-motion";

const SLIDES = [
  {
    id: "trust-decisions",
    label: "Trust decisions",
    description: "Brand identity and value proposition",
  },
  {
    id: "how-it-works",
    label: "How Abraxas works",
    description: "Protocol architecture and independent verification",
  },
] as const;

const SWIPE_THRESHOLD_PX = 48;

export function PremiumHomeHeroCarousel() {
  const regionId = useId();
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [diagramMounted, setDiagramMounted] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (activeIndex === 1) {
      setDiagramMounted(true);
    }
  }, [activeIndex]);

  const goTo = useCallback((index: number) => {
    setActiveIndex((prev) => {
      const next = Math.max(0, Math.min(SLIDES.length - 1, index));
      return next === prev ? prev : next;
    });
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(activeIndex - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(activeIndex + 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        goTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goTo(SLIDES.length - 1);
      }
    },
    [activeIndex, goTo],
  );

  const onTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  }, []);

  const diagramScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeIndex !== 1) return;
    const el = diagramScrollRef.current;
    if (!el || typeof el.scrollTo !== "function") return;
    el.scrollTo({ left: 0, behavior: "auto" });
  }, [activeIndex]);

  const scrollDiagramStages = useCallback((direction: -1 | 1) => {
    const el = diagramScrollRef.current;
    if (!el) return;
    const step = Math.max(el.clientWidth * 0.72, 220);
    if (typeof el.scrollBy === "function") {
      el.scrollBy({ left: direction * step, behavior: "smooth" });
      return;
    }
    el.scrollLeft += direction * step;
  }, []);

  const onTouchEnd = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      if (activeIndex === 1) {
        touchStartX.current = null;
        return;
      }
      const start = touchStartX.current;
      touchStartX.current = null;
      if (start == null) return;
      const end = event.changedTouches[0]?.clientX ?? start;
      const delta = end - start;
      if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
      if (delta < 0) goTo(activeIndex + 1);
      else goTo(activeIndex - 1);
    },
    [activeIndex, goTo],
  );

  return (
    <div
      className={`abx-premium-hero-carousel${activeIndex === 1 ? " abx-premium-hero-carousel--architecture" : ""}`}
    >
      <div
        id={regionId}
        className="abx-premium-hero-carousel__region"
        role="region"
        aria-roledescription="carousel"
        aria-label="Abraxas introduction"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className={`abx-premium-hero-carousel__track${reducedMotion ? " abx-premium-hero-carousel__track--instant" : ""}`}
          style={{ ["--abx-hero-slide-index" as string]: activeIndex }}
        >
          <div
            className="abx-premium-hero-carousel__slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${SLIDES[0].label}. ${SLIDES[0].description}`}
            aria-hidden={activeIndex !== 0}
            inert={activeIndex !== 0}
          >
            <PremiumHomeHero emblemActive={activeIndex === 0} variant="carousel" />
          </div>

          <div
            className="abx-premium-hero-carousel__slide abx-premium-hero-carousel__slide--diagram"
            role="group"
            aria-roledescription="slide"
            aria-label={`${SLIDES[1].label}. ${SLIDES[1].description}`}
            aria-hidden={activeIndex !== 1}
            inert={activeIndex !== 1}
          >
            <div className="abx-premium-hero-carousel__diagram-shell">
              <p className="abx-premium-hero-carousel__diagram-scroll-hint" id={`${regionId}-diagram-hint`}>
                Use stages 01–04 to explore each step. Open the full diagram when you need the complete visual.
              </p>
              <div className="abx-premium-hero-carousel__diagram-scroll-wrap">
                <div
                  ref={diagramScrollRef}
                  className="abx-premium-hero-carousel__diagram-scroll"
                  role="group"
                  aria-roledescription="scrollable architecture diagram"
                  aria-label="Trust is continuous architecture diagram"
                  aria-describedby={`${regionId}-diagram-hint`}
                  tabIndex={0}
                >
                  {diagramMounted ? (
                    <HomeTrustContinuousArchitectureImage priority={false} />
                  ) : (
                    <div className="abx-premium-hero-carousel__diagram-placeholder" aria-hidden="true" />
                  )}
                </div>
                <div className="abx-premium-hero-carousel__diagram-scroll-controls" aria-hidden="false">
                  <button
                    type="button"
                    className="abx-premium-hero-carousel__diagram-scroll-btn"
                    aria-label="Scroll architecture stages left"
                    onClick={() => scrollDiagramStages(-1)}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="abx-premium-hero-carousel__diagram-scroll-btn"
                    aria-label="Scroll architecture stages right"
                    onClick={() => scrollDiagramStages(1)}
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="abx-premium-hero-carousel__footer">
          <nav className="abx-premium-hero-carousel__nav" aria-label="Hero slides">
            <ol className="abx-premium-hero-carousel__nav-list">
              {SLIDES.map((slide, index) => {
                const selected = index === activeIndex;
                return (
                  <li key={slide.id}>
                    <button
                      type="button"
                      className={`abx-premium-hero-carousel__nav-btn${selected ? " abx-premium-hero-carousel__nav-btn--active" : ""}`}
                      aria-current={selected ? "true" : undefined}
                      aria-controls={regionId}
                      aria-label={`Show slide ${index + 1}: ${slide.label}`}
                      onClick={() => goTo(index)}
                    >
                      <span className="abx-premium-hero-carousel__nav-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className="abx-premium-hero-carousel__nav-label">{slide.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="abx-premium-hero-carousel__cta-rail" aria-label="Primary actions">
            <Link
              className="abx-premium-hero-carousel__cta abx-premium-hero-carousel__cta--primary"
              href={CINEMATIC_HOME_CTA_PRIMARY_HREF}
            >
              {CINEMATIC_HOME_CTA_PRIMARY}
            </Link>
            <Link
              className="abx-premium-hero-carousel__cta abx-premium-hero-carousel__cta--secondary"
              href={CINEMATIC_HOME_CTA_PRIMARY_HREF}
            >
              Start sandbox
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
