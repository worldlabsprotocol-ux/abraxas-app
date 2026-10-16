// FILE: components/home/defi/DeFiCinematicHomeHero.tsx
// Reference A cinematic homepage hero — centered typography, animated emblem, glass modules.

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  DEFI_HOME_CTA_PRIMARY,
  DEFI_HOME_CTA_PRIMARY_HREF,
  DEFI_HOME_CTA_SECONDARY,
  DEFI_HOME_CTA_SECONDARY_HREF,
  DEFI_HOME_EYEBROW,
  DEFI_HOME_HEADLINE,
  DEFI_HOME_SUPPORT,
} from "@/lib/home/defiVisualHomeCopy";
import { HomeTrustPipelineStrip } from "@/components/home/defi/HomeTrustPipelineStrip";
import Image from "next/image";
import { OFFICIAL_EMBLEM_HERO_WEBP } from "@/lib/brand/officialBrandAssets";

const AbraxasHeroCenterpiece = dynamic(
  () => import("@/components/home/defi/AbraxasHeroCenterpiece").then((m) => m.AbraxasHeroCenterpiece),
  {
    ssr: false,
    loading: () => (
      <div className="abx-defi-centerpiece abx-defi-centerpiece--static" aria-hidden="true">
        <div className="abx-defi-centerpiece__atmosphere" />
        <div className="abx-defi-centerpiece__stage">
          <Image
            src={OFFICIAL_EMBLEM_HERO_WEBP.src}
            alt=""
            width={OFFICIAL_EMBLEM_HERO_WEBP.width}
            height={OFFICIAL_EMBLEM_HERO_WEBP.height}
            priority
            className="abx-defi-centerpiece__emblem"
          />
        </div>
      </div>
    ),
  },
);

const HomeTrustGlassModules = dynamic(
  () => import("@/components/home/defi/HomeTrustGlassModules").then((m) => m.HomeTrustGlassModules),
  { ssr: false },
);

export function DeFiCinematicHomeHero() {
  return (
    <header className="abx-defi-hero abx-premium-home" aria-label="Abraxas institutional trust">
      <div className="abx-defi-hero__noise" aria-hidden="true" />
      <div className="abx-defi-hero__inner">
        <p className="abx-defi-hero__eyebrow">{DEFI_HOME_EYEBROW}</p>
        <h1 className="abx-defi-hero__title">{DEFI_HOME_HEADLINE}</h1>
        <p className="abx-defi-hero__support">{DEFI_HOME_SUPPORT}</p>
        <div className="abx-defi-hero__actions">
          <Link className="abx-defi-hero__cta abx-defi-hero__cta--primary" href={DEFI_HOME_CTA_PRIMARY_HREF}>
            {DEFI_HOME_CTA_PRIMARY}
          </Link>
          <Link className="abx-defi-hero__cta abx-defi-hero__cta--ghost" href={DEFI_HOME_CTA_SECONDARY_HREF}>
            {DEFI_HOME_CTA_SECONDARY}
          </Link>
        </div>

        <div className="abx-defi-hero__stage-wrap">
          <AbraxasHeroCenterpiece />
          <HomeTrustGlassModules />
        </div>

        <HomeTrustPipelineStrip />
      </div>
    </header>
  );
}
