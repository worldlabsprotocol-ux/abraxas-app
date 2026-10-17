"use client";
// FILE: components/home/HomeHowAbraxasWorksSection.tsx
// Single interactive trust explanation — reuses pipeline artwork; deep diagrams on demand.

import dynamic from "next/dynamic";
import { LazyHomeSection } from "@/components/home/LazyHomeSection";
import { HomeTrustPipelineStrip } from "@/components/home/defi/HomeTrustPipelineStrip";
import { HOMEPAGE_HOW_HEADING, HOMEPAGE_HOW_LEAD } from "@/lib/home/homepageHowCopy";

const HomeVerificationLifecycle = dynamic(
  () => import("@/components/home/premium/HomeVerificationLifecycle").then((m) => m.HomeVerificationLifecycle),
  { ssr: false, loading: () => <div className="abx-lazy-home-section" style={{ minHeight: "12rem" }} aria-hidden /> },
);

const HomeFlagshipProtocolVisuals = dynamic(
  () => import("@/components/home/HomeFlagshipProtocolVisuals").then((m) => m.HomeFlagshipProtocolVisuals),
  { ssr: false, loading: () => <div className="abx-lazy-home-section" style={{ minHeight: "10rem" }} aria-hidden /> },
);

export function HomeHowAbraxasWorksSection() {
  return (
    <section id="how-abraxas-works" className="abx-home-how-works" aria-labelledby="home-how-heading">
      <p className="abx-v2-eyebrow">Protocol</p>
      <h2 id="home-how-heading" className="abx-v2-section-title">
        {HOMEPAGE_HOW_HEADING}
      </h2>
      <p className="abx-v2-section-lead abx-v2-section-lead--tight">{HOMEPAGE_HOW_LEAD}</p>

      <HomeTrustPipelineStrip variant="homepage-how" />

      <details className="abx-home-how-works__advanced">
        <summary>Lifecycle diagram — evidence narrows at each boundary</summary>
        <LazyHomeSection minHeight="18rem">
          <HomeVerificationLifecycle />
        </LazyHomeSection>
      </details>

      <details className="abx-home-how-works__advanced">
        <summary>Passport-to-partner authorization flow</summary>
        <LazyHomeSection minHeight="12rem">
          <HomeFlagshipProtocolVisuals />
        </LazyHomeSection>
      </details>
    </section>
  );
}
