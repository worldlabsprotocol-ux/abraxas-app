"use client";
// FILE: components/redesign/RedesignHome.tsx
// Institutional public homepage — product architecture first, evidence-backed surfaces.

import { WalletContextProvider } from "@/components/WalletContextProvider";
import { HomeAudiencePanels } from "@/components/home/HomeAudiencePanels";
import { HomeGoodTroubleIntegration } from "@/components/home/HomeGoodTroubleIntegration";
import { HomeLiveStats } from "@/components/home/HomeLiveStats";
import { HomeProductEvidence } from "@/components/home/HomeProductEvidence";
import { HomeTrustClose } from "@/components/home/HomeTrustClose";
import { HomeTwoAppReferenceProof } from "@/components/home/HomeTwoAppReferenceProof";
import { HomeIntegrationCatalog } from "@/components/institutional/HomeIntegrationCatalog";
import { HomeJourneyPaths } from "@/components/institutional/HomeJourneyPaths";
import { HomeOperationalReadiness } from "@/components/institutional/HomeOperationalReadiness";
import { InstitutionalHomeHero } from "@/components/institutional/InstitutionalHomeHero";
import { TrustBoundaryPanel } from "@/components/institutional/TrustBoundaryPanel";
import { VerifyOnceThesisDiagram } from "@/components/product";
import { ABX_SPACING, abxAccentCssVars } from "@/lib/design/abraxasDesignSystem";
import { abxMotionCssVars } from "@/lib/design/abraxasMotion";
import { RedesignNav } from "./RedesignNav";
import { RedesignFooter } from "./RedesignFooter";

const SHELL: React.CSSProperties = {
  maxWidth: 1120,
  margin: "0 auto",
  padding: `0 ${ABX_SPACING.pagePadding}`,
  width: "100%",
};

function HomeContent() {
  return (
    <main className="abx-institutional-home" style={{ position: "relative", zIndex: 1, paddingBottom: "3.5rem" }}>
      <div
        className="abx-institutional-home__shell"
        style={{
          ...SHELL,
          display: "flex",
          flexDirection: "column",
          gap: ABX_SPACING.sectionGap,
        }}
      >
        <InstitutionalHomeHero />
        <TrustBoundaryPanel />
        <HomeOperationalReadiness />
        <HomeJourneyPaths />
        <HomeIntegrationCatalog />
        <HomeProductEvidence />
        <VerifyOnceThesisDiagram />
        <HomeTwoAppReferenceProof />
        <HomeGoodTroubleIntegration />
        <HomeLiveStats />
        <HomeAudiencePanels />
        <HomeTrustClose />
      </div>
    </main>
  );
}

export function RedesignHome() {
  return (
    <WalletContextProvider>
      <div
        data-theme="dark"
        data-motion-tier="institutional"
        className="abx-institutional-shell abx-command-center"
        style={{ ...abxMotionCssVars(), ...abxAccentCssVars("neutral") }}
      >
        <RedesignNav />
        <HomeContent />
        <RedesignFooter />
      </div>
    </WalletContextProvider>
  );
}
