"use client";
// FILE: components/redesign/RedesignHome.tsx
// Homepage: hero hook → blog context → demo → registry.

import { useState } from "react";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { SuiAuthProvider } from "@/components/sui/SuiAuthProvider";
import { AmbientGlow } from "./AmbientGlow";
import { RedesignNav } from "./RedesignNav";
import { AbraxasBootScreen } from "./AbraxasBootScreen";
import { RedesignFooter } from "./RedesignFooter";
import { AssetsExplorer } from "./AssetsExplorer";
import { HomeSharpHero } from "@/components/home/HomeSharpHero";
import { HomeDemoVideo } from "@/components/home/HomeDemoVideo";
import { HomeTrustTransferStrip } from "@/components/home/HomeTrustTransferStrip";
import { HomeReusableComplianceStrip } from "@/components/home/HomeReusableComplianceStrip";
import { HomeBuildWithSection } from "@/components/home/HomeBuildWithSection";
import { HomeStackPosition } from "@/components/home/HomeStackPosition";
import { HomeNetworkEffect } from "@/components/home/HomeNetworkEffect";
import { HomePartnersBrief } from "@/components/home/HomePartnersBrief";
import { HomeFeaturedArticle } from "@/components/home/HomeFeaturedArticle";
import { HomeRegistrySlideshow } from "@/components/home/HomeRegistrySlideshow";

const MAXW: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "0 clamp(1rem, 3vw, 2rem)",
};

// Homepage registry: Cielo + Chickasaw + Good Trouble (always). Pokémon on /verify only.
const HOME_REGISTRY_EXCLUDE = ["smyrna-townhome", "naj-tulum", "the-clove", "cmn-pokemon-collection"];
const HOME_REGISTRY_PIN = ["genesis-asset", "chickasaw-project", "good-trouble-cannabis"];

function HomeContent() {
  return (
    <main style={{ position: "relative", zIndex: 1 }}>
      <div style={MAXW}>
        <HomeSharpHero />
      </div>
      <HomeFeaturedArticle lead />
      <div style={MAXW}>
        <HomeDemoVideo />
        <HomeTrustTransferStrip />
        <HomeReusableComplianceStrip />
        <HomeBuildWithSection />
        <HomeStackPosition />
        <HomeNetworkEffect />
        <div
          id="registry"
          style={{
            paddingTop: "clamp(1.5rem, 4vw, 2.5rem)",
            paddingBottom: "clamp(1rem, 3vw, 1.5rem)",
            borderBottom: "1px solid var(--border-strong)",
          }}
        >
          <HomeRegistrySlideshow />
          <AssetsExplorer
            title="Live proof on-registry"
            eyebrow="Reference assets"
            home
            pinIds={HOME_REGISTRY_PIN}
            excludeIds={HOME_REGISTRY_EXCLUDE}
          />
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
