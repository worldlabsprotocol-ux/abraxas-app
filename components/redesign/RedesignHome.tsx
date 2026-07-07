"use client";
// FILE: components/redesign/RedesignHome.tsx
// De-duplicated homepage — one registry surface, architecture-first hero.

import { WalletContextProvider } from "@/components/WalletContextProvider";
import { AmbientGlow } from "./AmbientGlow";
import { RedesignNav } from "./RedesignNav";
import { RedesignHero } from "./RedesignHero";
import { AbraxasBootScreen } from "./AbraxasBootScreen";
import { ProductLoopDemo } from "./ProductLoopDemo";
import { EcosystemShowcases } from "./EcosystemShowcases";
import { AssetsExplorer } from "./AssetsExplorer";
import { IntegratorStrip } from "./IntegratorStrip";
import { BrowseWithoutKycBanner } from "./BrowseWithoutKycBanner";
import { NetworkProductsSection } from "@/components/vision/NetworkProductsSection";
import { IssuerHolderVerifierSection } from "@/components/vision/IssuerHolderVerifierSection";
import { ClaimStackSection } from "@/components/vision/ClaimStackSection";
import { KycDebtSection } from "./KycDebtSection";
import { SupplyNetworkTeaser } from "./SupplyNetworkTeaser";
import { AppleWalletPromo } from "./AppleWalletPromo";
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
          <div style={{ ...MAXW, paddingTop: "1.25rem" }}><RedesignHero /></div>

          <div id="test-network" style={{ ...MAXW, paddingTop: "1.25rem" }}>
            <TestTheNetworkSection />
          </div>

          <div style={{ ...MAXW, paddingTop: "1.25rem" }}><ChainArchitectureStrip /></div>

          <div style={{ ...MAXW, paddingTop: "1.25rem" }}><AppleWalletPromo /></div>

          <div style={{ ...MAXW, paddingTop: "1.25rem" }}><BrowseWithoutKycBanner /></div>

          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}><NetworkProductsSection /></div>
          <div style={{ ...MAXW, paddingTop: "1.25rem" }}><IssuerHolderVerifierSection /></div>
          <div style={{ ...MAXW, paddingTop: "1.25rem" }}><ClaimStackSection /></div>

          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <ProductLoopDemo />
          </div>

          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <EcosystemShowcases />
          </div>

          <div id="registry" style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <AssetsExplorer title="Public registry" />
            <div style={{ marginTop: "1.25rem" }}><AssuranceLegend /></div>
          </div>

          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <KycDebtSection />
          </div>

          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <IntegratorStrip />
          </div>

          <div style={{ ...MAXW, paddingTop: "var(--section-gap)" }}>
            <SupplyNetworkTeaser />
          </div>

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
