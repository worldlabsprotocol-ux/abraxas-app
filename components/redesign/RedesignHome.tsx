"use client";
// FILE: components/redesign/RedesignHome.tsx
// Sandbox-first homepage — hero · sandbox · how it works · evidence · build.

import type { CSSProperties, ReactNode } from "react";
import { HomeUnifiedProductEntry } from "@/components/home/HomeUnifiedProductEntry";
import { HomeProtocolInfrastructureSection } from "@/components/home/HomeProtocolInfrastructureSection";
import { HomeProtocolSignalMarquee } from "@/components/home/HomeProtocolSignalMarquee";
import { ABX_SPACING, abxAccentCssVars } from "@/lib/design/abraxasDesignSystem";
import { ABX_V2_SHELL_CLASS } from "@/lib/design/institutionalV2Tokens";
import { abxMotionCssVars } from "@/lib/design/abraxasMotion";
import { RedesignNav } from "./RedesignNav";
import { RedesignFooter } from "./RedesignFooter";

const SHELL: CSSProperties = {
  maxWidth: 1320,
  margin: "0 auto",
  padding: `0 ${ABX_SPACING.pagePadding}`,
  width: "100%",
  boxSizing: "border-box",
};

function HomeContent({ hero }: { hero: ReactNode }) {
  return (
    <main className="abx-institutional-home abx-v2-home abx-premium-home" style={{ position: "relative", zIndex: 1, paddingBottom: "3.5rem" }}>
      {hero}
      <HomeProtocolSignalMarquee />

      <div
        className="abx-premium-home__spine abx-premium-home__spine--shell abx-premium-home__spine--unified"
        style={SHELL}
      >
        <HomeProtocolInfrastructureSection />
        <HomeUnifiedProductEntry />
      </div>
    </main>
  );
}

export function RedesignHome({ hero }: { hero: ReactNode }) {
  return (
    <div
      data-theme="dark"
      data-motion-tier="cinematic"
      className={`abx-institutional-shell abx-command-center abx-v2-shell ${ABX_V2_SHELL_CLASS}`}
      style={{ ...abxMotionCssVars(), ...abxAccentCssVars("neutral") }}
    >
      <RedesignNav />
      <HomeContent hero={hero} />
      <RedesignFooter />
    </div>
  );
}
