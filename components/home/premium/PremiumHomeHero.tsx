import Link from "next/link";
import {
  CINEMATIC_HOME_CTA_PRIMARY,
  CINEMATIC_HOME_CTA_PRIMARY_HREF,
  CINEMATIC_HOME_CTA_SECONDARY,
  CINEMATIC_HOME_CTA_SECONDARY_HREF,
  CINEMATIC_HOME_HEADLINE,
  CINEMATIC_HOME_LEAD,
} from "@/lib/home/cinematicHomeCopy";
import { PremiumHomeHeroVisualEnhanced } from "@/components/home/premium/PremiumHomeHeroVisualEnhanced";

const HEADLINE_LINES = ["Prove what matters.", "Keep what's yours."];

/** Server-rendered hero copy for LCP; emblem hydrates client-side after first paint. */
export function PremiumHomeHero() {
  return (
    <header className="abx-premium-hero abx-premium-hero--enhanced" aria-label="Abraxas: prove what matters">
      <div className="abx-premium-hero__atmosphere" aria-hidden="true" />
      <div className="abx-premium-hero__depth-plane" aria-hidden="true" />
      <div className="abx-premium-hero__grid" aria-hidden="true" />
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
          <div className="abx-premium-hero__actions abx-premium-hero__reveal abx-premium-hero__reveal--4">
            <Link className="abx-premium-hero__cta abx-premium-hero__cta--primary" href={CINEMATIC_HOME_CTA_PRIMARY_HREF}>
              {CINEMATIC_HOME_CTA_PRIMARY}
            </Link>
            <Link
              className="abx-premium-hero__cta abx-premium-hero__cta--secondary"
              href={CINEMATIC_HOME_CTA_SECONDARY_HREF}
            >
              {CINEMATIC_HOME_CTA_SECONDARY}
            </Link>
          </div>
          <p className="abx-premium-hero__sr-only">{CINEMATIC_HOME_HEADLINE}</p>
        </div>
        <div className="abx-premium-hero__visual-wrap abx-premium-hero__reveal abx-premium-hero__reveal--2">
          <PremiumHomeHeroVisualEnhanced />
        </div>
      </div>
      <div className="abx-premium-hero__baseline" aria-hidden="true" />
    </header>
  );
}
