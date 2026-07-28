"use client";
// FILE: components/redesign/RedesignHome.tsx
// Homepage: hero hook → blog context → demo → registry.

import { useState } from "react";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { AmbientGlow } from "./AmbientGlow";
import { RedesignNav } from "./RedesignNav";
import { AbraxasBootScreen } from "./AbraxasBootScreen";
import { RedesignFooter } from "./RedesignFooter";
import { HomeRegistrySlideshow } from "@/components/home/HomeRegistrySlideshow";
import { HomeSharpHero } from "@/components/home/HomeSharpHero";
import { HomeTrustPillars } from "@/components/home/HomeTrustPillars";
import { HomeBiometricSection } from "@/components/home/HomeBiometricSection";
import { HomeLiveStats } from "@/components/home/HomeLiveStats";
import { HomeDemoVideo } from "@/components/home/HomeDemoVideo";
import { HomeBuildWithSection } from "@/components/home/HomeBuildWithSection";
import { HomePartnersBrief } from "@/components/home/HomePartnersBrief";
import { HomeFeaturedArticle } from "@/components/home/HomeFeaturedArticle";

const MAXW: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "0 clamp(1.25rem, 4vw, 2rem)",
};

const SECTION_GAP = "clamp(2rem, 6vw, 3.25rem)";

function HomeContent() {
  return (
    <main style={{ position: "relative", zIndex: 1, paddingBottom: "3rem" }}>
      <div style={MAXW}>
        <HomeSharpHero />
      </div>
      <div style={{ marginBottom: SECTION_GAP }}>
        <HomeFeaturedArticle lead />
      </div>
      <div style={{ ...MAXW, display: "flex", flexDirection: "column", gap: SECTION_GAP }}>
        <HomeTrustPillars />
        <HomeBiometricSection />
        <HomeLiveStats />
        <HomeDemoVideo />
        <HomeBuildWithSection />
        <div
          id="registry"
          style={{
            paddingTop: "0.5rem",
            paddingBottom: "0.5rem",
            borderBottom: "1px solid var(--border-strong)",
          }}
        >
          <HomeRegistrySlideshow />
        </div>
        <HomePartnersBrief />
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
