"use client";
// FILE: components/redesign/RedesignHome.tsx
// Protocol command center — capability map first, then how it works and proof.

import { WalletContextProvider } from "@/components/WalletContextProvider";
import { HomeAudiencePanels } from "@/components/home/HomeAudiencePanels";
import { HomePartnerProof } from "@/components/home/HomePartnerProof";
import { HomeCapabilityMap } from "@/components/home/HomeCapabilityMap";
import { HomeGoodTroubleIntegration } from "@/components/home/HomeGoodTroubleIntegration";
import { HomeSharpHero } from "@/components/home/HomeSharpHero";
import { HomeArchitectureFlow, VerifyOnceThesisDiagram } from "@/components/product";
import { HomeTrustClose } from "@/components/home/HomeTrustClose";
import { Reveal } from "@/lib/motion/Reveal";
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
        <Reveal as="section">
          <HomeSharpHero />
        </Reveal>
        <Reveal as="section" delay={0.04}>
          <VerifyOnceThesisDiagram />
        </Reveal>
        <Reveal as="section" delay={0.06}>
          <HomeArchitectureFlow />
        </Reveal>
        <Reveal as="section" delay={0.08}>
          <HomeGoodTroubleIntegration />
        </Reveal>
        <Reveal as="section" delay={0.1}>
          <HomeCapabilityMap />
        </Reveal>
        <Reveal as="section" delay={0.12}>
          <HomeAudiencePanels />
        </Reveal>
        <Reveal as="section" delay={0.14}>
          <HomeTrustClose />
        </Reveal>
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
