"use client";

import Link from "next/link";
import {
  CINEMATIC_HOME_CTA_PRIMARY,
  CINEMATIC_HOME_CTA_PRIMARY_HREF,
  CINEMATIC_HOME_HEADLINE,
  CINEMATIC_HOME_LEAD,
} from "@/lib/home/cinematicHomeCopy";
import { PremiumHomeHeroVisualEnhanced } from "@/components/home/premium/PremiumHomeHeroVisualEnhanced";
import { PROTOCOL_HERO_TITLE } from "@/lib/home/protocolPositioningCopy";

const HEADLINE_LINES = PROTOCOL_HERO_TITLE.split(". ").map((part, i, arr) =>
  i < arr.length - 1 ? `${part}.` : part,
).filter(Boolean);

/** Server-rendered hero copy for LCP; emblem hydrates client-side after first paint. */
export function PremiumHomeHero({
  emblemActive = true,
  variant = "standalone",
}: {
  emblemActive?: boolean;
  variant?: "standalone" | "carousel";
}) {
  const heroClass =
    variant === "carousel"
      ? "abx-premium-hero abx-premium-hero--enhanced abx-premium-hero--carousel"
      : "abx-premium-hero abx-premium-hero--enhanced";

  return (
    <header className={heroClass} aria-label="Abraxas: prove what matters">
      <div className="abx-premium-hero__atmosphere" aria-hidden="true" />
      <div className="abx-premium-hero__depth-plane" aria-hidden="true" />
      <div className="abx-premium-hero__grid" aria-hidden="true" />
      <div className="abx-premium-hero__trace-field" aria-hidden="true" />
      <div className="abx-premium-hero__layout abx-premium-hero__layout--composed">
        <div className="abx-premium-hero__copy">
          <h1 className="abx-premium-hero__title">
            {HEADLINE_LINES.map((text, i) => (
              <span key={text} className="abx-premium-hero__title-line">
                <span
                  className={`abx-premium-hero__title-inner abx-premium-hero__reveal abx-premium-hero__reveal--${i + 1}`}
                >
                  {text}
                </span>
              </span>
            ))}
          </h1>
          <p className="abx-premium-hero__lead abx-premium-hero__reveal abx-premium-hero__reveal--3">{CINEMATIC_HOME_LEAD}</p>
          {variant === "standalone" ? (
            <div className="abx-premium-hero__actions abx-premium-hero__reveal abx-premium-hero__reveal--4">
              <Link className="abx-premium-hero__cta abx-premium-hero__cta--primary" href={CINEMATIC_HOME_CTA_PRIMARY_HREF}>
                {CINEMATIC_HOME_CTA_PRIMARY}
              </Link>
            </div>
          ) : null}
          <p className="abx-premium-hero__sr-only">{CINEMATIC_HOME_HEADLINE}</p>
        </div>
        <div className="abx-premium-hero__visual-wrap abx-premium-hero__reveal abx-premium-hero__reveal--2">
          {emblemActive ? <PremiumHomeHeroVisualEnhanced /> : null}
        </div>
      </div>
      <div className="abx-premium-hero__baseline" aria-hidden="true" />
    </header>
  );
}
