"use client";
// FILE: components/redesign/RedesignHome.tsx
// Homepage — problem → solution → three layers → proof → registry.
// Vertical apps (music, Wyoming, supply chain) live off-homepage; not the lead story.

import { WalletContextProvider } from "@/components/WalletContextProvider";
import { AmbientGlow } from "./AmbientGlow";
import { RedesignNav } from "./RedesignNav";
import { AbraxasBootScreen } from "./AbraxasBootScreen";
import { ProductLoopDemo } from "./ProductLoopDemo";
import { AssetsExplorer } from "./AssetsExplorer";
import { IntegratorStrip } from "./IntegratorStrip";
import { BrowseWithoutKycBanner } from "./BrowseWithoutKycBanner";
import { NetworkProductsSection } from "@/components/vision/NetworkProductsSection";
import { IssuerHolderVerifierSection } from "@/components/vision/IssuerHolderVerifierSection";
import { ClaimStackSection } from "@/components/vision/ClaimStackSection";
import { KycDebtSection } from "./KycDebtSection";
import { HomeBillboardHero } from "./HomeBillboardHero";
import { HomeOnboardingStrip } from "./HomeOnboardingStrip";
import { HomeFAQTeaser } from "./HomeFAQTeaser";
import { RoadmapCTA } from "./RoadmapCTA";
import { RedesignFooter } from "./RedesignFooter";
import { TestTheNetworkSection } from "./TestTheNetworkSection";
import { ChainArchitectureStrip } from "./ChainArchitectureStrip";
import { AssuranceLegend } from "./AssuranceLegend";

const MAXW: React.CSSProperties = {
  maxWidth: 1180, margin: "0 auto",
  padding: "0 clamp(1rem, 3vw, 2rem)",
};

export function RedesignHome() {
  return (
    <WalletContextProvider>
      <AbraxasBootScreen />
      <div data-theme="dark" style={{
        background: "var(--bg)", color: "var(--text-primary)",
        minHeight: "100vh", position: "relative", overflowX: "hidden",
      }}>
        <AmbientGlow />
        <RedesignNav />

        <main style={{ position: "relative", zIndex: 1 }}>
          {/* 1. Billboard hero — instant context + network visual */}
          <div style={MAXW}><HomeBillboardHero /></div>

          {/* 2. Inline onboarding — mass adoption path */}
          <div style={{ ...MAXW, paddingTop: "1.25rem" }}><HomeOnboardingStrip /></div>

          {/* 3. Problem → solution (deeper context) */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}><KycDebtSection /></div>

          {/* 4. What Abraxas is in product terms */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}><NetworkProductsSection /></div>
          <div style={{ ...MAXW, paddingTop: "1.25rem" }}><IssuerHolderVerifierSection /></div>

          {/* 5. Browse first, verify when needed */}
          <div style={{ ...MAXW, paddingTop: "1.25rem" }}><BrowseWithoutKycBanner /></div>

          {/* 6. Public proof */}
          <div id="test-network" style={{ ...MAXW, paddingTop: "1.25rem" }}>
            <TestTheNetworkSection />
          </div>

          {/* 7. One example loop (Cielo) — not a separate product line */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <ProductLoopDemo />
          </div>

          {/* 8. Registry */}
          <div id="registry" style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <AssetsExplorer title="Public registry" />
            <div style={{ marginTop: "1.25rem" }}><AssuranceLegend /></div>
          </div>

          {/* 9. Depth for partners / sophisticated readers */}
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}><ClaimStackSection /></div>
          <div style={{ ...MAXW, paddingTop: "1.25rem" }}><ChainArchitectureStrip /></div>
          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}><IntegratorStrip /></div>

          <div style={{ ...MAXW, paddingTop: "var(--section-gap)", paddingBottom: "var(--section-gap)" }}>
            <HomeFAQTeaser />
            <div style={{ marginTop: "1.5rem" }}><RoadmapCTA /></div>
          </div>
        </main>

        <RedesignFooter />
      </div>
    </WalletContextProvider>
  );
}
