"use client";
// FILE: components/redesign/RedesignHome.tsx
// Homepage story: problem → industries → proof → ecosystem.

import { useState } from "react";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { AmbientGlow } from "./AmbientGlow";
import { RedesignNav } from "./RedesignNav";
import { AbraxasBootScreen } from "./AbraxasBootScreen";
import { RedesignFooter } from "./RedesignFooter";
import { HomeSharpHero } from "@/components/home/HomeSharpHero";
import { HomeWhyAbraxas } from "@/components/home/HomeWhyAbraxas";
import { HomeVerifyOnceDiagram } from "@/components/home/HomeVerifyOnceDiagram";
import { HomeVerificationPipeline } from "@/components/home/HomeVerificationPipeline";
import { HomeTrustPillars } from "@/components/home/HomeTrustPillars";
import { HomeRegulatedIndustries } from "@/components/home/HomeRegulatedIndustries";
import { HomeProtocolInAction } from "@/components/home/HomeProtocolInAction";
import { HomeLiveStats } from "@/components/home/HomeLiveStats";
import { HomeDocsBrief } from "@/components/home/HomeDocsBrief";
import { HomeCinematicDemo } from "@/components/home/HomeCinematicDemo";
import { HomeRegistrySlideshow } from "@/components/home/HomeRegistrySlideshow";
import { HomeRoadmapBrief } from "@/components/home/HomeRoadmapBrief";

const MAXW: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "0 clamp(1.25rem, 4vw, 2rem)",
};

const SECTION_GAP = "clamp(2rem, 6vw, 3.25rem)";

const FONT = "'Inter',system-ui,sans-serif";

function HomeCinematicSection() {
  return (
    <section aria-labelledby="home-cinematic-heading" className="abx-home-section-copy abx-elite-demo">
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
        How verification should work
      </div>
      <h2
        id="home-cinematic-heading"
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1.15rem, 3vw, 1.45rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          margin: "0 0 1rem",
        }}
      >
        One proof instead of seven checks
      </h2>
      <HomeCinematicDemo />
    </section>
  );
}

function HomeContent() {
  return (
    <main style={{ position: "relative", zIndex: 1, paddingBottom: "3rem" }}>
      <div style={{ ...MAXW, display: "flex", flexDirection: "column", gap: SECTION_GAP }}>
        <HomeSharpHero />
        <HomeWhyAbraxas />
        <HomeCinematicSection />
        <HomeVerifyOnceDiagram />
        <HomeVerificationPipeline />
        <HomeTrustPillars />
        <HomeRegulatedIndustries />
        <HomeRegistrySlideshow />
        <HomeProtocolInAction />
        <HomeLiveStats />
        <HomeDocsBrief />
        <HomeRoadmapBrief />
      </div>
    </main>
  );
}

export function RedesignHome() {
  const [bootReady, setBootReady] = useState(false);

  return (
    <WalletContextProvider>
      <AbraxasBootScreen onReady={setBootReady} />
      {bootReady && (
        <div data-theme="dark" className="abx-institutional-shell">
          <AmbientGlow />
          <RedesignNav />
          <HomeContent />
          <RedesignFooter />
        </div>
      )}
    </WalletContextProvider>
  );
}
