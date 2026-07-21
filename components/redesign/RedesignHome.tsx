"use client";
// FILE: components/redesign/RedesignHome.tsx
// Homepage: emotion → demo → build → ecosystem → proof.

import { useState } from "react";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { SuiAuthProvider } from "@/components/sui/SuiAuthProvider";
import { AmbientGlow } from "./AmbientGlow";
import { RedesignNav } from "./RedesignNav";
import { AbraxasBootScreen } from "./AbraxasBootScreen";
import { RedesignFooter } from "./RedesignFooter";
import { HomeReferenceProofStrip } from "@/components/home/HomeReferenceProofStrip";
import { HomeSharpHero } from "@/components/home/HomeSharpHero";
import { HomeHonestStatusStrip } from "@/components/home/HomeHonestStatusStrip";
import { HomePositioningStrip } from "@/components/home/HomePositioningStrip";
import { HomeAgenticFinanceStrip } from "@/components/home/HomeAgenticFinanceStrip";
import { HomeProductVisualSection } from "@/components/home/HomeProductVisualSection";
import { HomeThesisEssaySection } from "@/components/home/HomeThesisEssaySection";
import { HomeMarketTicker } from "@/components/home/HomeMarketTicker";
import { HomeBuildWithSection } from "@/components/home/HomeBuildWithSection";
import { HomeStackPosition } from "@/components/home/HomeStackPosition";
import { HomeNetworkEffect } from "@/components/home/HomeNetworkEffect";
import { HomeSignedInModule } from "@/components/home/HomeSignedInModule";
import { HomePartnersBrief } from "@/components/home/HomePartnersBrief";

const MAXW: React.CSSProperties = {
  maxWidth: 1180, margin: "0 auto",
  padding: "0 clamp(1rem, 3vw, 2rem)",
};

function HomeContent() {
  return (
    <main style={{ position: "relative", zIndex: 1 }}>
      <div style={MAXW}>
        <HomeSharpHero />
        <HomeAgenticFinanceStrip />
        <HomeProductVisualSection />
        <HomeThesisEssaySection />
        <HomeHonestStatusStrip />
        <HomePositioningStrip />
        <HomeMarketTicker />
        <HomeBuildWithSection />
        <HomeStackPosition />
        <HomeNetworkEffect />
        <HomeReferenceProofStrip />
        <HomePartnersBrief />
        <HomeSignedInModule />
      </div>
    </main>
  );
}

export function RedesignHome() {
  const [bootReady, setBootReady] = useState(false);

  return (
    <WalletContextProvider>
      <SuiAuthProvider>
        <AbraxasBootScreen onReady={setBootReady} />
        {bootReady && (
          <div data-theme="dark" className="abx-institutional-shell">
            <AmbientGlow />
            <RedesignNav />
            <HomeContent />
            <RedesignFooter />
          </div>
        )}
      </SuiAuthProvider>
    </WalletContextProvider>
  );
}
