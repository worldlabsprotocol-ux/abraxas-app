"use client";

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

export function InstitutionalHomeHero() {
  return (
    <section className="abx-cinematic-hero abx-v2-hero" aria-label="Abraxas — prove what matters">
      <div className="abx-cinematic-hero__copy abx-v2-hero__copy">
        <p className="abx-v2-eyebrow">Abraxas verification</p>
        <h1 className="abx-v2-hero__title abx-cinematic-hero__title">{CINEMATIC_HOME_HEADLINE}</h1>
        <p className="abx-v2-hero__lead">{CINEMATIC_HOME_LEAD}</p>
        <div className="abx-v2-hero__actions">
          <Btn href={CINEMATIC_HOME_CTA_PRIMARY_HREF} size="md">
            {CINEMATIC_HOME_CTA_PRIMARY}
          </Btn>
          <Btn href={CINEMATIC_HOME_CTA_SECONDARY_HREF} variant="secondary" size="md">
            {CINEMATIC_HOME_CTA_SECONDARY}
          </Btn>
        </div>
      </div>
      <CinematicHomeHeroVisual />
    </section>
  );
}
