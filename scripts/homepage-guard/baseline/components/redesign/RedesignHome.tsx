"use client";
// FILE: components/redesign/RedesignHome.tsx
// Sandbox-first homepage — hero · sandbox · how it works · evidence · build.

import type { CSSProperties, ReactNode } from "react";
import { HomeHowAbraxasWorksSection } from "@/components/home/HomeHowAbraxasWorksSection";
import { HomeWhatAbraxasDoesSection } from "@/components/home/HomeWhatAbraxasDoesSection";
import { HomeWhyDefensibleSection } from "@/components/home/HomeWhyDefensibleSection";
import { HomeVerifiableTrustChapter } from "@/components/home/HomeVerifiableTrustChapter";
import { HomeBuildEntrySection } from "@/components/home/HomeBuildEntrySection";
import { LazyHomeSection } from "@/components/home/LazyHomeSection";
import { PremiumHomeChapter } from "@/components/home/premium/PremiumHomeChapter";
import { ABX_SPACING, abxAccentCssVars } from "@/lib/design/abraxasDesignSystem";
import { ABX_V2_SHELL_CLASS } from "@/lib/design/institutionalV2Tokens";
import { abxMotionCssVars } from "@/lib/design/abraxasMotion";
import { RedesignNav } from "./RedesignNav";
import { RedesignFooter } from "./RedesignFooter";
import { HomeSignedInModule } from "@/components/home/HomeSignedInModule";
import { HomeNativeSandboxChapter } from "@/components/home/HomeNativeSandboxChapter";

const SHELL: CSSProperties = {
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
        <LazyHomeSection minHeight="10rem" eager>
          <HomeNativeSandboxChapter />
        </LazyHomeSection>

        <HomeSignedInModule />

        <PremiumHomeChapter index="01" label="How it works" id="chapter-how">
          <HomeHowAbraxasWorksSection />
        </PremiumHomeChapter>

        <PremiumHomeChapter index="02" label="Protocol" id="chapter-what">
          <HomeWhatAbraxasDoesSection />
        </PremiumHomeChapter>

        <PremiumHomeChapter index="03" label="Defensible" id="chapter-why">
          <HomeWhyDefensibleSection />
        </PremiumHomeChapter>

        <PremiumHomeChapter index="04" label="Result" id="chapter-evidence" bleed>
          <LazyHomeSection minHeight="22rem" eager>
            <HomeVerifiableTrustChapter />
          </LazyHomeSection>
        </PremiumHomeChapter>

        <PremiumHomeChapter index="05" label="Ready" id="chapter-build-wrap">
          <HomeBuildEntrySection />
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
