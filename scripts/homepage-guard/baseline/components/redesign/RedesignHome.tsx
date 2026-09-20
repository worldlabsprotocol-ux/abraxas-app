"use client";
// FILE: components/redesign/RedesignHome.tsx
// Protocol command center — capability map first, then how it works and proof.

import { WalletContextProvider } from "@/components/WalletContextProvider";
import { HomeAudiencePanels } from "@/components/home/HomeAudiencePanels";
import { HomePartnerProof } from "@/components/home/HomePartnerProof";
import { HomeCapabilityMap } from "@/components/home/HomeCapabilityMap";
import { HomeProtocolMap } from "@/components/home/HomeProtocolMap";
import { HomeUseCases } from "@/components/home/HomeUseCases";
import { HomeGoodTroubleIntegration } from "@/components/home/HomeGoodTroubleIntegration";
import { HomeSharpHero } from "@/components/home/HomeSharpHero";
import { HomeProductEvidence } from "@/components/home/HomeProductEvidence";
import { HomePolicyOutcomeStrip } from "@/components/home/HomePolicyOutcomeStrip";
import { HomeTrustClose } from "@/components/home/HomeTrustClose";
import { HomeProtocolInAction } from "@/components/home/HomeProtocolInAction";
import { AmbientGlow } from "./AmbientGlow";
import { RedesignNav } from "./RedesignNav";
import { RedesignFooter } from "./RedesignFooter";

const MAXW: React.CSSProperties = {
  maxWidth: 1040,
  margin: "0 auto",
  padding: "0 clamp(1.25rem, 4vw, 2rem)",
};

const SECTION_GAP = "clamp(2.5rem, 7vw, 4rem)";

function HomeContent() {
  return (
    <main style={{ position: "relative", zIndex: 1, paddingBottom: "3.5rem", textAlign: "center" }}>
      <div className="abx-command-shell" style={{ ...MAXW, display: "flex", flexDirection: "column", gap: SECTION_GAP, alignItems: "center", width: "100%" }}>
        <HomeSharpHero />
        <HomeCapabilityMap />
        <HomeProtocolMap />
        <HomeUseCases />
        <HomeProductEvidence />
        <HomePolicyOutcomeStrip />
        <HomeGoodTroubleIntegration />
        <HomeProtocolInAction />
        <HomePartnerProof />
        <HomeAudiencePanels />
        <HomeTrustClose />
      </div>
    </main>
  );
}

export function RedesignHome() {
  return (
    <WalletContextProvider>
      <div data-theme="dark" className="abx-institutional-shell abx-command-center">
        <AmbientGlow />
        <RedesignNav />
        <HomeContent />
        <RedesignFooter />
      </div>
    </WalletContextProvider>
  );
}
