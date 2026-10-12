"use client";
// FILE: components/redesign/RedesignHome.tsx
// Institutional V2 homepage — editorial hero, trust exhibit, evidence, capability matrix.

import { WalletContextProvider } from "@/components/WalletContextProvider";
import { CapabilityMatrix } from "@/components/institutional/CapabilityMatrix";
import { InstitutionalHomeClose } from "@/components/institutional/InstitutionalHomeClose";
import { InstitutionalHomeHero } from "@/components/institutional/InstitutionalHomeHero";
import { LiveProtocolEvidence } from "@/components/institutional/LiveProtocolEvidence";
import { TrustModelExhibit } from "@/components/institutional/TrustModelExhibit";
import { ABX_SPACING, abxAccentCssVars } from "@/lib/design/abraxasDesignSystem";
import { ABX_V2_SHELL_CLASS } from "@/lib/design/institutionalV2Tokens";
import { abxMotionCssVars } from "@/lib/design/abraxasMotion";
import { RedesignNav } from "./RedesignNav";
import { RedesignFooter } from "./RedesignFooter";

const SHELL: React.CSSProperties = {
  maxWidth: 1320,
  margin: "0 auto",
  padding: `0 ${ABX_SPACING.pagePadding}`,
  width: "100%",
};

function HomeContent() {
  return (
    <main className="abx-institutional-home abx-v2-home" style={{ position: "relative", zIndex: 1, paddingBottom: "3.5rem" }}>
      <div
        className="abx-institutional-home__shell"
        style={{
          ...SHELL,
          display: "flex",
          flexDirection: "column",
          gap: "clamp(2.75rem, 7vw, 4.5rem)",
        }}
      >
        <InstitutionalHomeHero />
        <TrustModelExhibit />
        <LiveProtocolEvidence />
        <CapabilityMatrix />
        <InstitutionalHomeClose />
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
        className={`abx-institutional-shell abx-command-center abx-v2-shell ${ABX_V2_SHELL_CLASS}`}
        style={{ ...abxMotionCssVars(), ...abxAccentCssVars("neutral") }}
      >
        <RedesignNav />
        <HomeContent />
        <RedesignFooter />
      </div>
    </WalletContextProvider>
  );
}
