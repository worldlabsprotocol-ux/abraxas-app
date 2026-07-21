"use client";
// FILE: components/redesign/RedesignHome.tsx
// Homepage: hero → minimum proof → mainnet E2E → deck → article.

import { useState } from "react";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { SuiAuthProvider } from "@/components/sui/SuiAuthProvider";
import { AmbientGlow } from "./AmbientGlow";
import { RedesignNav } from "./RedesignNav";
import { AbraxasBootScreen } from "./AbraxasBootScreen";
import { RedesignFooter } from "./RedesignFooter";
import { HomeSharpHero } from "@/components/home/HomeSharpHero";
import { HomeMinimumProofDemo } from "@/components/home/HomeMinimumProofDemo";
import { HomeMainnetVerificationStrip } from "@/components/home/HomeMainnetVerificationStrip";
import { HomeInstitutionalShowcase } from "@/components/home/HomeInstitutionalShowcase";
import { HomeFeaturedArticle } from "@/components/home/HomeFeaturedArticle";
import { HomeMarketTicker } from "@/components/home/HomeMarketTicker";
import { HomeSignedInModule } from "@/components/home/HomeSignedInModule";

const MAXW: React.CSSProperties = {
  maxWidth: 1180, margin: "0 auto",
  padding: "0 clamp(1rem, 3vw, 2rem)",
};

function HomeContent() {
  return (
    <main style={{ position: "relative", zIndex: 1 }}>
      <div style={MAXW}>
        <HomeSharpHero />
        <HomeMinimumProofDemo />
        <HomeMainnetVerificationStrip />
        <HomeInstitutionalShowcase />
      </div>
      <HomeFeaturedArticle />
      <div style={MAXW}>
        <HomeMarketTicker />
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
