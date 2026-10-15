"use client";
// FILE: components/redesign/RedesignHome.tsx
// Premium public homepage — editorial spine, signature interactions, verifiable trust depth.

import dynamic from "next/dynamic";
import { InstitutionalHomeClose } from "@/components/institutional/InstitutionalHomeClose";
import type { ReactNode } from "react";
import { HomeFlagshipProtocolVisuals } from "@/components/home/HomeFlagshipProtocolVisuals";
import { HomeProtocolPillarsSection } from "@/components/home/HomeProtocolPillarsSection";
import { HomeApplicationsReceiveSection } from "@/components/home/HomeApplicationsReceiveSection";
import { HomeVerificationLifecycle } from "@/components/home/premium/HomeVerificationLifecycle";
import { HomeVerifiableTrustChapter } from "@/components/home/HomeVerifiableTrustChapter";
import { LazyHomeSection } from "@/components/home/LazyHomeSection";
import { PremiumHomeChapter } from "@/components/home/premium/PremiumHomeChapter";
import { ABX_SPACING, abxAccentCssVars } from "@/lib/design/abraxasDesignSystem";
import { ABX_V2_SHELL_CLASS } from "@/lib/design/institutionalV2Tokens";
import { abxMotionCssVars } from "@/lib/design/abraxasMotion";
import { CINEMATIC_BUILD_CHAPTER_EYEBROW } from "@/lib/home/cinematicHomeCopy";
import { RedesignNav } from "./RedesignNav";
import { RedesignFooter } from "./RedesignFooter";
import { HomeSignedInModule } from "@/components/home/HomeSignedInModule";

const HomeGoodTroubleActionSection = dynamic(
  () => import("@/components/home/HomeGoodTroubleActionSection").then((m) => m.HomeGoodTroubleActionSection),
  { ssr: false, loading: () => <div className="abx-lazy-home-section" style={{ minHeight: "8rem" }} aria-hidden /> },
);

const CapabilityMatrix = dynamic(
  () => import("@/components/institutional/CapabilityMatrix").then((m) => m.CapabilityMatrix),
  { ssr: false, loading: () => <div className="abx-lazy-home-section" style={{ minHeight: "10rem" }} aria-hidden /> },
);

const SHELL: React.CSSProperties = {
  maxWidth: 1320,
  margin: "0 auto",
  padding: `0 ${ABX_SPACING.pagePadding}`,
  width: "100%",
  boxSizing: "border-box",
};

function HomeContent({ hero }: { hero: ReactNode }) {
  return (
    <main className="abx-institutional-home abx-v2-home abx-premium-home" style={{ position: "relative", zIndex: 1, paddingBottom: "3.5rem" }}>
      {hero}

      <div className="abx-premium-home__spine abx-premium-home__spine--shell" style={SHELL}>
        <HomeSignedInModule />
        <PremiumHomeChapter index="01" label="Capabilities" id="chapter-capabilities">
          <HomeProtocolPillarsSection />
        </PremiumHomeChapter>

        <PremiumHomeChapter index="02" label="System" id="chapter-problem">
          <HomeFlagshipProtocolVisuals />
        </PremiumHomeChapter>

        <PremiumHomeChapter index="03" label="Authorization" id="chapter-authorization" bleed>
          <LazyHomeSection minHeight="12rem" eager>
            <HomeApplicationsReceiveSection />
          </LazyHomeSection>
        </PremiumHomeChapter>

        <PremiumHomeChapter index="04" label="Lifecycle" id="chapter-lifecycle">
          <LazyHomeSection minHeight="18rem" eager>
            <HomeVerificationLifecycle />
          </LazyHomeSection>
        </PremiumHomeChapter>

        <PremiumHomeChapter index="05" label="Demonstration" id="chapter-demo">
          <LazyHomeSection minHeight="12rem">
            <HomeGoodTroubleActionSection />
          </LazyHomeSection>
        </PremiumHomeChapter>

        <PremiumHomeChapter index="06" label="Evidence" id="chapter-evidence" bleed>
          <LazyHomeSection minHeight="22rem" eager>
            <HomeVerifiableTrustChapter />
          </LazyHomeSection>
        </PremiumHomeChapter>

        <PremiumHomeChapter index="07" label="Build" id="chapter-build">
          <section className="abx-cinematic-build-chapter" aria-labelledby="home-build-heading">
            <p className="abx-v2-eyebrow">{CINEMATIC_BUILD_CHAPTER_EYEBROW}</p>
            <h2 id="home-build-heading" className="abx-v2-section-title">
              Build
            </h2>
            <p className="abx-v2-section-lead abx-v2-section-lead--tight">
              Integration Studio and Launchpad: sandbox first, production via operator review.
            </p>
            <LazyHomeSection minHeight="12rem">
              <CapabilityMatrix />
            </LazyHomeSection>
          </section>
          <InstitutionalHomeClose />
        </PremiumHomeChapter>
      </div>
    </main>
  );
}

export function RedesignHome({ hero }: { hero: ReactNode }) {
  return (
    <div
      data-theme="dark"
      data-motion-tier="cinematic"
      className={`abx-institutional-shell abx-command-center abx-v2-shell ${ABX_V2_SHELL_CLASS}`}
      style={{ ...abxMotionCssVars(), ...abxAccentCssVars("neutral") }}
    >
      <RedesignNav />
      <HomeContent hero={hero} />
      <RedesignFooter />
    </div>
  );
}
