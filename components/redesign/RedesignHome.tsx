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
import { AssetsExplorer } from "./AssetsExplorer";
import { HomeSharpHero } from "@/components/home/HomeSharpHero";
import { HomeHonestStatusStrip } from "@/components/home/HomeHonestStatusStrip";
import { HomePositioningStrip } from "@/components/home/HomePositioningStrip";
import { HomeMarketTicker } from "@/components/home/HomeMarketTicker";
import { HomeDemoVideo } from "@/components/home/HomeDemoVideo";
import { HomeBuildWithSection } from "@/components/home/HomeBuildWithSection";
import { HomeStackPosition } from "@/components/home/HomeStackPosition";
import { HomeNetworkEffect } from "@/components/home/HomeNetworkEffect";
import { HomeSignedInModule } from "@/components/home/HomeSignedInModule";
import { HomePartnersBrief } from "@/components/home/HomePartnersBrief";

const MAXW: React.CSSProperties = {
  maxWidth: 1180, margin: "0 auto",
  padding: "0 clamp(1rem, 3vw, 2rem)",
};

const HOME_REGISTRY_EXCLUDE = ["smyrna-townhome"];

function HomeContent() {
  return (
    <main style={{ position: "relative", zIndex: 1 }}>
      <div style={MAXW}>
        <HomeSharpHero />
        <HomeHonestStatusStrip />
        <HomePositioningStrip />
        <HomeMarketTicker />
        <HomeDemoVideo />
        <HomeBuildWithSection />
        <HomeStackPosition />
        <HomeNetworkEffect />
        <div id="registry" style={{
          paddingTop: "clamp(0.5rem, 2vw, 1rem)",
          paddingBottom: "clamp(1rem, 3vw, 1.5rem)",
          borderBottom: "1px solid var(--border-strong)",
        }}>
          <AssetsExplorer
            title="Live proof on-registry"
            eyebrow="Reference assets"
            home
            excludeIds={HOME_REGISTRY_EXCLUDE}
          />
        </div>
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
