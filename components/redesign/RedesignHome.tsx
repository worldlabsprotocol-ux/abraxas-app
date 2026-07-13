"use client";
// FILE: components/redesign/RedesignHome.tsx
// Three-action homepage — assets first, closed-loop positioning.

import { useState } from "react";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { SuiAuthProvider } from "@/components/sui/SuiAuthProvider";
import { AmbientGlow } from "./AmbientGlow";
import { RedesignNav } from "./RedesignNav";
import { AbraxasBootScreen } from "./AbraxasBootScreen";
import { RedesignFooter } from "./RedesignFooter";
import { AssetsExplorer } from "./AssetsExplorer";
import { ProductLoopDemo } from "./ProductLoopDemo";
import { HomeSharpHero } from "@/components/home/HomeSharpHero";
import { HomeSignedInModule } from "@/components/home/HomeSignedInModule";
import { HomePartnersBrief } from "@/components/home/HomePartnersBrief";
import { HomeValueProp } from "@/components/home/HomeValueProp";
import { HomeWorkflowCompare } from "@/components/home/HomeWorkflowCompare";
import { HomeLiveTodayStrip } from "@/components/home/HomeLiveTodayStrip";
import { HomeLearnHub } from "@/components/home/HomeLearnHub";

const MAXW: React.CSSProperties = {
  maxWidth: 1180, margin: "0 auto",
  padding: "0 clamp(1rem, 3vw, 2rem)",
};

/** Active heavy hitters only — Smyrna stays in full registry, not homepage strip. */
const HOME_REGISTRY_EXCLUDE = ["smyrna-townhome"];

function HomeContent() {
  return (
    <main style={{ position: "relative", zIndex: 1 }}>
      <div style={MAXW}>
        <HomeSharpHero />
        <div id="registry" style={{
          paddingTop: "clamp(0.5rem, 2vw, 1rem)",
          paddingBottom: "clamp(1rem, 3vw, 1.5rem)",
          borderBottom: "1px solid var(--border-strong)",
        }}>
          <AssetsExplorer
            title="Verified assets · acquire on Abraxas"
            eyebrow="Registry"
            home
            excludeIds={HOME_REGISTRY_EXCLUDE}
          />
        </div>
        <HomeLiveTodayStrip />
        <HomePartnersBrief />
        <HomeWorkflowCompare />
        <HomeLearnHub />
        <HomeValueProp />
        <HomeSignedInModule />
        <div style={{ padding: "clamp(1.5rem, 4vw, 2.5rem) 0", borderTop: "1px solid var(--border-strong)" }}>
          <ProductLoopDemo />
        </div>
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
          <div data-theme="dark" style={{
            background: "var(--bg)", color: "var(--text-primary)",
            minHeight: "100vh", position: "relative", overflowX: "hidden",
          }}>
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
