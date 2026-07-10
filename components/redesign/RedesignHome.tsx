"use client";
// FILE: components/redesign/RedesignHome.tsx
// Three-action homepage — progressive disclosure for everything else.

import { WalletContextProvider } from "@/components/WalletContextProvider";
import { SuiAuthProvider } from "@/components/sui/SuiAuthProvider";
import { AmbientGlow } from "./AmbientGlow";
import { RedesignNav } from "./RedesignNav";
import { AbraxasBootScreen } from "./AbraxasBootScreen";
import { RedesignFooter } from "./RedesignFooter";
import { AssetsExplorer } from "./AssetsExplorer";
import { HomeSharpHero } from "@/components/home/HomeSharpHero";
import { HomeSignedInModule } from "@/components/home/HomeSignedInModule";
import { HomeCieloLoop } from "@/components/home/HomeCieloLoop";
import { HomePartnersBrief } from "@/components/home/HomePartnersBrief";
import { HomeValueProp } from "@/components/home/HomeValueProp";

const MAXW: React.CSSProperties = {
  maxWidth: 1180, margin: "0 auto",
  padding: "0 clamp(1rem, 3vw, 2rem)",
};

function HomeContent() {
  return (
    <main style={{ position: "relative", zIndex: 1 }}>
      <div style={MAXW}>
        <HomeSharpHero />
        <HomeValueProp />
        <HomeSignedInModule />
        <HomeCieloLoop />
        <div id="registry" style={{ paddingTop: "clamp(1.5rem, 4vw, 2rem)", borderTop: "1px solid var(--border-strong)" }}>
          <AssetsExplorer
            title="Example verified assets"
            eyebrow="Registry"
            home
          />
        </div>
        <HomePartnersBrief />
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
