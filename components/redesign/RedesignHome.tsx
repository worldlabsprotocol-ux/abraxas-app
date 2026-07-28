"use client";
// FILE: components/redesign/RedesignHome.tsx
// Homepage story: problem → solution → proof.

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
import { HomeLiveStats } from "@/components/home/HomeLiveStats";
import { HomePartnersBrief } from "@/components/home/HomePartnersBrief";
import { HomeDocsBrief } from "@/components/home/HomeDocsBrief";
import { HomeRoadmapBrief } from "@/components/home/HomeRoadmapBrief";

const MAXW: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "0 clamp(1.25rem, 4vw, 2rem)",
};

const SECTION_GAP = "clamp(2rem, 6vw, 3.25rem)";

function HomeContent() {
  return (
    <main style={{ position: "relative", zIndex: 1, paddingBottom: "3rem" }}>
      <div style={{ ...MAXW, display: "flex", flexDirection: "column", gap: SECTION_GAP }}>
        <HomeSharpHero />
        <HomeWhyAbraxas />
        <HomeVerifyOnceDiagram />
        <HomeVerificationPipeline />
        <HomeTrustPillars />
        <HomeLiveStats />
        <HomePartnersBrief />
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
