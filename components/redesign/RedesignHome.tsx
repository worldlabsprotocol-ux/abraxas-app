"use client";
// FILE: components/redesign/RedesignHome.tsx
// Sharp homepage — one action, supporting proof. Full depth lives on Trust Framework / docs.

import { WalletContextProvider } from "@/components/WalletContextProvider";
import { SuiAuthProvider } from "@/components/sui/SuiAuthProvider";
import { AmbientGlow } from "./AmbientGlow";
import { RedesignNav } from "./RedesignNav";
import { AbraxasBootScreen } from "./AbraxasBootScreen";
import { RedesignFooter } from "./RedesignFooter";
import { AssetsExplorer } from "./AssetsExplorer";
import { TrustFrameworkTeaser } from "@/components/vision/TrustFrameworkTeaser";
import { HomeSharpHero } from "@/components/home/HomeSharpHero";
import { HomeSignedInModule } from "@/components/home/HomeSignedInModule";
import { HomeProofSection } from "@/components/home/HomeProofSection";
import { HomePassportIntro } from "@/components/home/HomePassportIntro";
import { HomePublicProof } from "@/components/home/HomePublicProof";
import { HomeCieloLoop } from "@/components/home/HomeCieloLoop";
import { HomePartnersBrief } from "@/components/home/HomePartnersBrief";
import { HomeNetworkBrief } from "@/components/home/HomeNetworkBrief";
import { HomeClosingBand } from "@/components/home/HomeClosingBand";

const MAXW: React.CSSProperties = {
  maxWidth: 1180, margin: "0 auto",
  padding: "0 clamp(1rem, 3vw, 2rem)",
};

function HomeContent() {
  return (
    <main style={{ position: "relative", zIndex: 1 }}>
      <div style={MAXW}>
        <HomeSharpHero />
        <HomeSignedInModule />
        <HomeProofSection />
        <HomePassportIntro />
        <HomePublicProof />
        <HomeCieloLoop />
        <HomePartnersBrief />
        <HomeNetworkBrief />
        <TrustFrameworkTeaser />
        <div id="registry" style={{ paddingTop: "clamp(2rem, 5vw, 3rem)", borderTop: "1px solid var(--border-strong)" }}>
          <AssetsExplorer title="Browse registry" compact />
        </div>
        <HomeClosingBand />
      </div>
    </main>
  );
}

export function RedesignHome() {
  return (
    <WalletContextProvider>
      <SuiAuthProvider>
        <AbraxasBootScreen />
        <div data-theme="dark" style={{
          background: "var(--bg)", color: "var(--text-primary)",
          minHeight: "100vh", position: "relative", overflowX: "hidden",
        }}>
          <AmbientGlow />
          <RedesignNav />
          <HomeContent />
          <RedesignFooter />
        </div>
      </SuiAuthProvider>
    </WalletContextProvider>
  );
}
