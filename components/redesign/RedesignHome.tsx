"use client";
// FILE: components/redesign/RedesignHome.tsx
// Homepage: hook → demo video → live registry → partners & learn.

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
import { HomeSignedInModule } from "@/components/home/HomeSignedInModule";
import { HomePartnersBrief } from "@/components/home/HomePartnersBrief";
import { HomeLearnHub } from "@/components/home/HomeLearnHub";

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
        <HomeDemoVideo />
        <div id="registry" style={{
          paddingTop: "clamp(0.5rem, 2vw, 1rem)",
          paddingBottom: "clamp(1rem, 3vw, 1.5rem)",
          borderBottom: "1px solid var(--border-strong)",
        }}>
          <AssetsExplorer
            title="Real assets you can trust"
            eyebrow="Registry"
            home
            excludeIds={HOME_REGISTRY_EXCLUDE}
          />
        </div>
        <HomePartnersBrief />
        <HomeLearnHub />
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
