"use client";
// FILE: components/home/premium/PremiumHomeHeroCarousel.tsx
// Opening presentation, then an automatic discovery sequence. Manual controls remain.

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
import { usePathname } from "next/navigation";
import {
  CINEMATIC_HOME_CTA_PRIMARY,
  CINEMATIC_HOME_CTA_PRIMARY_HREF,
} from "@/lib/home/cinematicHomeCopy";
import {
  HOMEPAGE_DISCOVERY_CHAPTER_MS,
  HOMEPAGE_DISCOVERY_CHAPTERS,
  HOMEPAGE_DISCOVERY_CTA_NOTE,
  HOMEPAGE_DISCOVERY_OPENING_MS,
  HOMEPAGE_DISCOVERY_PILLAR_MS,
  HOMEPAGE_DISCOVERY_PILLARS,
} from "@/lib/home/homepageDiscovery";
import { PremiumHomeHero } from "@/components/home/premium/PremiumHomeHero";
import { HomeDiscoveryBegin, HomeDiscoveryStory } from "@/components/home/premium/HomeDiscoveryStory";
import { HomeTrustContinuousArchitectureImage } from "@/components/home/HomeTrustContinuousArchitectureImage";
import { resolvePublicNavPrimaryAction } from "@/lib/nav/publicNavPrimaryAction";
import { useReducedMotion } from "framer-motion";

const SWIPE_THRESHOLD_PX = 48;
const STORY_INDEX = HOMEPAGE_DISCOVERY_CHAPTERS.findIndex((chapter) => chapter.id === "story");
const ARCHITECTURE_INDEX = HOMEPAGE_DISCOVERY_CHAPTERS.findIndex((chapter) => chapter.id === "how-it-works");

function useStackedPresentation(reducedMotion: boolean | null): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(max-width: 719px)");
    const apply = () => setNarrow(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return Boolean(reducedMotion) || narrow;
}

export function PremiumHomeHeroCarousel() {
  const regionId = useId();
  const pathname = usePathname() ?? "/";
  const reducedMotion = useReducedMotion();
  const stacked = useStackedPresentation(reducedMotion);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activePillar, setActivePillar] = useState(0);
  const [paused, setPaused] = useState(false);
  const [diagramMounted, setDiagramMounted] = useState(false);
  const [ctaLabel, setCtaLabel] = useState(CINEMATIC_HOME_CTA_PRIMARY);
  const [ctaHref, setCtaHref] = useState(CINEMATIC_HOME_CTA_PRIMARY_HREF);
  const touchStartX = useRef<number | null>(null);
  const userMoved = useRef(false);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const enabledRes = await fetch("/api/auth/native/enabled", { credentials: "same-origin", cache: "no-store" });
        const enabledJson = (await enabledRes.json()) as { auth_mode?: string };
        if (enabledJson.auth_mode !== "ephemeral_wallet") return;
        const sessionRes = await fetch("/api/auth/wallet/session", { credentials: "same-origin", cache: "no-store" });
        const sessionJson = (await sessionRes.json()) as { authenticated?: boolean };
        if (cancelled || !sessionJson.authenticated) return;
        const action = resolvePublicNavPrimaryAction({
          developerSessionAuthenticated: true,
          pathname,
        });
        setCtaLabel(action.label);
        setCtaHref(action.href);
      } catch {
        // Visitors keep Start building when the session check is unavailable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (activeIndex === ARCHITECTURE_INDEX) setDiagramMounted(true);
  }, [activeIndex]);

  const goTo = useCallback((index: number, source: "user" | "auto") => {
    setActiveIndex((prev) => {
      const count = HOMEPAGE_DISCOVERY_CHAPTERS.length;
      const next = ((index % count) + count) % count;
      return next === prev ? prev : next;
    });
    if (source === "user") {
      userMoved.current = true;
      setPaused(true);
    }
  }, []);

  useEffect(() => {
    if (stacked || paused) return;
    const delay = activeIndex === 0 ? HOMEPAGE_DISCOVERY_OPENING_MS : HOMEPAGE_DISCOVERY_CHAPTER_MS;
    const timer = window.setTimeout(() => goTo(activeIndex + 1, "auto"), delay);
    return () => window.clearTimeout(timer);
  }, [activeIndex, goTo, paused, stacked]);

  useEffect(() => {
    if (stacked || paused || activeIndex !== STORY_INDEX) return;
    const timer = window.setTimeout(() => {
      setActivePillar((current) => (current + 1) % HOMEPAGE_DISCOVERY_PILLARS.length);
    }, HOMEPAGE_DISCOVERY_PILLAR_MS);
    return () => window.clearTimeout(timer);
  }, [activeIndex, activePillar, paused, stacked]);

  useEffect(() => {
    if (!stacked || !userMoved.current) return;
    userMoved.current = false;
    slideRefs.current[activeIndex]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeIndex, stacked]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(activeIndex - 1, "user");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(activeIndex + 1, "user");
      } else if (event.key === "Home") {
        event.preventDefault();
        goTo(0, "user");
      } else if (event.key === "End") {
        event.preventDefault();
        goTo(HOMEPAGE_DISCOVERY_CHAPTERS.length - 1, "user");
      }
    },
    [activeIndex, goTo],
  );

  const onTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  }, []);

  const onTouchEnd = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      if (stacked) {
        touchStartX.current = null;
        return;
      }
      const start = touchStartX.current;
      touchStartX.current = null;
      if (start == null) return;
      const end = event.changedTouches[0]?.clientX ?? start;
      const delta = end - start;
      if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
      goTo(activeIndex + (delta < 0 ? 1 : -1), "user");
    },
    [activeIndex, goTo, stacked],
  );

  const holdMs = activeIndex === 0 ? HOMEPAGE_DISCOVERY_OPENING_MS : HOMEPAGE_DISCOVERY_CHAPTER_MS;

  return (
    <div
      className={[
        "abx-premium-hero-carousel",
        activeIndex === ARCHITECTURE_INDEX ? "abx-premium-hero-carousel--architecture" : "",
        stacked ? "abx-premium-hero-carousel--stacked" : "",
        paused ? "abx-premium-hero-carousel--paused" : "",
      ].filter(Boolean).join(" ")}
      style={{ ["--abx-discovery-hold" as string]: `${holdMs}ms` }}
    >
      <div
        id={regionId}
        className="abx-premium-hero-carousel__region"
        role="region"
        aria-roledescription="presentation"
        aria-label="Abraxas introduction"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className={`abx-premium-hero-carousel__track${reducedMotion || stacked ? " abx-premium-hero-carousel__track--instant" : ""}`}
          style={{
            ["--abx-hero-slide-index" as string]: activeIndex,
            gridTemplateColumns: `repeat(${HOMEPAGE_DISCOVERY_CHAPTERS.length}, 100%)`,
          }}
          onPointerDown={() => setPaused(true)}
        >
          {HOMEPAGE_DISCOVERY_CHAPTERS.map((chapter, index) => {
            const selected = index === activeIndex;
            const hidden = !stacked && !selected;
            return (
              <div
                key={chapter.id}
                ref={(node) => {
                  slideRefs.current[index] = node;
                }}
                className={`abx-premium-hero-carousel__slide${chapter.id === "how-it-works" ? " abx-premium-hero-carousel__slide--diagram" : ""}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${chapter.label}. ${chapter.description}`}
                aria-hidden={hidden}
                inert={hidden ? "" : undefined}
              >
                {chapter.id === "opening" ? (
                  <PremiumHomeHero emblemActive={selected || stacked} variant="carousel" />
                ) : null}
                {chapter.id === "story" ? (
                  <HomeDiscoveryStory
                    activePillar={activePillar}
                    onSelectPillar={(pillar) => {
                      setActivePillar(pillar);
                      setPaused(true);
                    }}
                  />
                ) : null}
                {chapter.id === "how-it-works" ? (
                  <div className="abx-premium-hero-carousel__diagram-shell">
                    {diagramMounted || stacked ? (
                      <HomeTrustContinuousArchitectureImage priority={false} />
                    ) : (
                      <div className="abx-premium-hero-carousel__diagram-placeholder" aria-hidden="true" />
                    )}
                  </div>
                ) : null}
                {chapter.id === "begin" ? <HomeDiscoveryBegin /> : null}
              </div>
            );
          })}
        </div>

        <div className="abx-premium-hero-carousel__footer">
          <nav className="abx-premium-hero-carousel__nav" aria-label="Introduction chapters">
            <ol className="abx-premium-hero-carousel__nav-list">
              {HOMEPAGE_DISCOVERY_CHAPTERS.map((chapter, index) => {
                const selected = index === activeIndex;
                return (
                  <li key={chapter.id}>
                    <button
                      type="button"
                      className={`abx-premium-hero-carousel__nav-btn${selected ? " abx-premium-hero-carousel__nav-btn--active" : ""}`}
                      aria-current={selected ? "true" : undefined}
                      aria-controls={regionId}
                      aria-label={`Show slide ${index + 1}: ${chapter.label}`}
                      onClick={() => goTo(index, "user")}
                    >
                      <span className="abx-premium-hero-carousel__nav-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className="abx-premium-hero-carousel__nav-label">{chapter.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="abx-premium-hero-carousel__transport">
              <button type="button" onClick={() => goTo(activeIndex - 1, "user")}>Previous</button>
              <button type="button" onClick={() => goTo(activeIndex + 1, "user")}>Next</button>
              {stacked ? null : (
                <button type="button" onClick={() => setPaused((current) => !current)}>
                  {paused ? "Resume presentation" : "Pause presentation"}
                </button>
              )}
            </div>
          </nav>

          <div className="abx-premium-hero-carousel__cta-rail" aria-label="Primary action">
            <p className="abx-premium-hero-carousel__cta-note">{HOMEPAGE_DISCOVERY_CTA_NOTE}</p>
            <Link className="abx-premium-hero-carousel__cta abx-premium-hero-carousel__cta--primary" href={ctaHref}>
              {ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
