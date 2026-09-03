"use client";
// FILE: components/redesign/RedesignHome.tsx
// Minimal homepage — problem, benefit, action in five sections.

import { WalletContextProvider } from "@/components/WalletContextProvider";
import { HomeAudiencePanels } from "@/components/home/HomeAudiencePanels";
import { HomePartnerProof } from "@/components/home/HomePartnerProof";
import { HomeHowItWorks } from "@/components/home/HomeHowItWorks";
import { HomeSharpHero } from "@/components/home/HomeSharpHero";
import { HomeTrustClose } from "@/components/home/HomeTrustClose";
import { AmbientGlow } from "./AmbientGlow";
import { RedesignNav } from "./RedesignNav";
import { RedesignFooter } from "./RedesignFooter";

const MAXW: React.CSSProperties = {
  maxWidth: 980,
  margin: "0 auto",
  padding: "0 clamp(1.25rem, 4vw, 2rem)",
};

const SECTION_GAP = "clamp(2.5rem, 7vw, 4rem)";

function HomeContent() {
  return (
    <main style={{ position: "relative", zIndex: 1, paddingBottom: "3.5rem", textAlign: "center" }}>
      <div style={{ ...MAXW, display: "flex", flexDirection: "column", gap: SECTION_GAP, alignItems: "center", width: "100%" }}>
        <HomeSharpHero />
        <HomeHowItWorks />
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
      <div data-theme="dark" className="abx-institutional-shell">
        <AmbientGlow />
        <RedesignNav />
        <HomeContent />
        <RedesignFooter />
      </div>
    </WalletContextProvider>
  );
}
