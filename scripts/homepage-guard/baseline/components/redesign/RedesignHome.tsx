"use client";
// FILE: components/redesign/RedesignHome.tsx
// Homepage — commercial one-pager narrative (hero → problem → flow → use cases → CTA).

import { useState } from "react";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { AmbientGlow } from "./AmbientGlow";
import { RedesignNav } from "./RedesignNav";
import { AbraxasBootScreen } from "./AbraxasBootScreen";
import { RedesignFooter } from "./RedesignFooter";
import { HomeSharpHero } from "@/components/home/HomeSharpHero";
import { HomeProblemSection } from "@/components/home/HomeProblemSection";
import { HomeHowItWorksFlow } from "@/components/home/HomeHowItWorksFlow";
import { HomePartnerReceives } from "@/components/home/HomePartnerReceives";
import { HomeRegulatedIndustries } from "@/components/home/HomeRegulatedIndustries";
import { HomeAlreadyBuilt } from "@/components/home/HomeAlreadyBuilt";
import { HomePartnerIntegration } from "@/components/home/HomePartnerIntegration";
import { HomeFinalCta } from "@/components/home/HomeFinalCta";

const MAXW: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "0 clamp(1.25rem, 4vw, 2rem)",
};

const SECTION_GAP = "clamp(2rem, 6vw, 3.25rem)";

function HomeContent() {
  return (
    <main style={{ position: "relative", zIndex: 1, paddingBottom: "3rem", textAlign: "center" }}>
      <div style={{ ...MAXW, display: "flex", flexDirection: "column", gap: SECTION_GAP, alignItems: "center", width: "100%" }}>
        <HomeSharpHero />
        <HomeProblemSection />
        <HomeHowItWorksFlow />
        <HomePartnerReceives />
        <HomeRegulatedIndustries />
        <HomeAlreadyBuilt />
        <HomePartnerIntegration />
        <HomeFinalCta />
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
