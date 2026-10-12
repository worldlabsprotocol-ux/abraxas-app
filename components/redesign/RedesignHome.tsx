"use client";
// FILE: components/redesign/RedesignHome.tsx
// Build #545 — cinematic public homepage with scroll chapters and verifiable trust depth.

import { WalletContextProvider } from "@/components/WalletContextProvider";
import { CapabilityMatrix } from "@/components/institutional/CapabilityMatrix";
import { InstitutionalHomeClose } from "@/components/institutional/InstitutionalHomeClose";
import { InstitutionalHomeHero } from "@/components/institutional/InstitutionalHomeHero";
import { HomeGoodTroubleActionSection } from "@/components/home/HomeGoodTroubleActionSection";
import { HomeHowItWorksStrip } from "@/components/home/HomeHowItWorksStrip";
import { HomeProblemChapter } from "@/components/home/HomeProblemChapter";
import { HomeVerifiableTrustChapter } from "@/components/home/HomeVerifiableTrustChapter";
import { HomeVerifyProtectReuse } from "@/components/home/HomeVerifyProtectReuse";
import { ABX_SPACING, abxAccentCssVars } from "@/lib/design/abraxasDesignSystem";
import { ABX_V2_SHELL_CLASS } from "@/lib/design/institutionalV2Tokens";
import { abxMotionCssVars } from "@/lib/design/abraxasMotion";
import { CINEMATIC_BUILD_CHAPTER_EYEBROW } from "@/lib/home/cinematicHomeCopy";
import { RedesignNav } from "./RedesignNav";
import { RedesignFooter } from "./RedesignFooter";

const SHELL: React.CSSProperties = {
  maxWidth: 1320,
  margin: "0 auto",
  padding: `0 ${ABX_SPACING.pagePadding}`,
  width: "100%",
};

function HomeContent() {
  return (
    <main className="abx-institutional-home abx-v2-home abx-cinematic-home" style={{ position: "relative", zIndex: 1, paddingBottom: "3.5rem" }}>
      <div
        className="abx-institutional-home__shell"
        style={{
          ...SHELL,
          display: "flex",
          flexDirection: "column",
          gap: "clamp(2.75rem, 7vw, 4.75rem)",
        }}
      >
        <InstitutionalHomeHero />
        <HomeProblemChapter />
        <HomeVerifyProtectReuse />
        <HomeHowItWorksStrip />
        <HomeGoodTroubleActionSection />
        <HomeVerifiableTrustChapter />
        <section className="abx-cinematic-build-chapter" aria-labelledby="home-build-heading">
          <p className="abx-v2-eyebrow">{CINEMATIC_BUILD_CHAPTER_EYEBROW}</p>
          <h2 id="home-build-heading" className="abx-v2-section-title">
            Integration paths
          </h2>
          <p className="abx-v2-section-lead">
            Explore the integration studio and sandbox flows. Production activation requires operator review — not
            unrestricted self-serve mainnet access.
          </p>
          <CapabilityMatrix />
        </section>
        <InstitutionalHomeClose />
      </div>
    </main>
  );
}

export function RedesignHome() {
  return (
    <WalletContextProvider>
      <div
        data-theme="dark"
        data-motion-tier="institutional"
        className={`abx-institutional-shell abx-command-center abx-v2-shell ${ABX_V2_SHELL_CLASS}`}
        style={{ ...abxMotionCssVars(), ...abxAccentCssVars("neutral") }}
      >
        <RedesignNav />
        <HomeContent />
        <RedesignFooter />
      </div>
    </WalletContextProvider>
  );
}
