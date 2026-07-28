"use client";
// FILE: components/redesign/RedesignHome.tsx
// Homepage — proof-first, fewer repeated section templates.

import { useState } from "react";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { RedesignNav } from "./RedesignNav";
import { AbraxasBootScreen } from "./AbraxasBootScreen";
import { RedesignFooter } from "./RedesignFooter";
import { HomeSharpHero } from "@/components/home/HomeSharpHero";
import { HomeWhyAbraxas } from "@/components/home/HomeWhyAbraxas";
import { HomeVerificationPipeline } from "@/components/home/HomeVerificationPipeline";
import { HomeProtocolInAction } from "@/components/home/HomeProtocolInAction";
import { HomeLiveStats } from "@/components/home/HomeLiveStats";
import { HomeDocsBrief } from "@/components/home/HomeDocsBrief";
import { HomeRoadmapBrief } from "@/components/home/HomeRoadmapBrief";

const BOOT_SEEN_KEY = "abraxas_boot_seen_v1";

const MAXW: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "0 clamp(1.25rem, 4vw, 2rem)",
};

const SECTION_GAP = "clamp(2.25rem, 5.5vw, 3.5rem)";

function HomeContent() {
  return (
    <main style={{ position: "relative", zIndex: 1, paddingBottom: "3rem" }}>
      <div style={{ ...MAXW, display: "flex", flexDirection: "column", gap: SECTION_GAP }}>
        <HomeSharpHero />
        <HomeProtocolInAction />
        <HomeWhyAbraxas />
        <HomeVerificationPipeline />
        <HomeLiveStats />
        <HomeDocsBrief />
        <HomeRoadmapBrief />
      </div>
    </main>
  );
}

export function RedesignHome() {
  const [bootReady, setBootReady] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(BOOT_SEEN_KEY) === "1";
    } catch {
      return false;
    }
  });

  return (
    <WalletContextProvider>
      <AbraxasBootScreen onReady={() => setBootReady(true)} />
      {bootReady && (
        <div data-theme="dark" className="abx-institutional-shell">
          <RedesignNav />
          <HomeContent />
          <RedesignFooter />
        </div>
      )}
    </WalletContextProvider>
  );
}
