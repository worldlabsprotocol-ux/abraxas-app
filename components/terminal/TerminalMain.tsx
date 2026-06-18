"use client";
// FILE: components/terminal/TerminalMain.tsx
// State machine + layout. Renders deep views or the main scrolling terminal.
// Every sub-component is imported. No inline definitions, no nested functions.

import { useState, useEffect }      from "react";
import { FlagshipAssetPage }        from "@/components/assets/FlagshipAssetPage";
import { AssetOwnerOnboarding }     from "@/components/onboarding/AssetOwnerOnboarding";
import { TrustStack }               from "@/components/onboarding/TrustStack";
import { TokenizationRequestModal } from "@/components/TokenizationRequestModal";

import { DeepViewShell }      from "./DeepViewShell";
import { RegistryView }       from "./RegistryView";
import { HeroSection }        from "./HeroSection";
import { AssetGrid }          from "./AssetGrid";
import { WyomingSection }     from "./WyomingSection";
import { MusicSection }       from "./MusicSection";
import { PartnersSection }    from "./PartnersSection";
import { ContentSection }     from "./ContentSection";
import { InvestorPortalModal} from "./InvestorPortalModal";
import { Divider, ScrollFade } from "./ui";

import type { DeepView, WyomingTier } from "./types";

const MAX_WIDTH: React.CSSProperties = {
  maxWidth: 1060,
  margin: "0 auto",
  padding: "1rem clamp(0.75rem,2.5vw,1.5rem) 0.75rem",
};

export function TerminalMain() {
  const [deep,        setDeep]        = useState<DeepView>("main");
  const [wyOpen,      setWyOpen]      = useState(false);
  const [initialTier, setInitialTier] = useState<WyomingTier | null>(null);
  const [investAsset, setInvestAsset] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  function goMain() { setDeep("main"); }

  // Deep view routing. One conditional block, one return path
  if (deep !== "main") {
    return (
      <DeepViewShell onBack={goMain}>
        {deep === "asset"    && <FlagshipAssetPage />}
        {deep === "submit"   && <AssetOwnerOnboarding onEnterTerminal={goMain} />}
        {deep === "trust"    && <TrustStack />}
        {deep === "registry" && <RegistryView onBack={goMain} />}
      </DeepViewShell>
    );
  }

  // Main terminal view. Single return, all sections composed and fade-in animated
  return (
    <div>
      <TokenizationRequestModal
        open={wyOpen}
        initialTier={initialTier}
        onClose={() => { setWyOpen(false); setInitialTier(null); }}
      />

      <InvestorPortalModal
        assetId={investAsset}
        onClose={() => setInvestAsset(null)}
      />

      <div style={MAX_WIDTH}>
        <HeroSection onGetVerified={() => setDeep("submit")} />

        <Divider />

        <div id="abraxas-id" />

        <ScrollFade>
          <AssetGrid
            onViewRegistry={() => setDeep("registry")}
            onInvest={(assetId) => setInvestAsset(assetId)}
          />
        </ScrollFade>

        <Divider />

        <ScrollFade>
          <WyomingSection
            onSelectTier={(tier: WyomingTier) => {
              setInitialTier(tier);
              setWyOpen(true);
            }}
            onBrowse={() => {
              setInitialTier(null);
              setWyOpen(true);
            }}
          />
        </ScrollFade>

        <Divider />

        <ScrollFade>
          <MusicSection />
        </ScrollFade>

        <Divider />

        <ScrollFade>
          <PartnersSection />
        </ScrollFade>

        <Divider />

        <ScrollFade>
          <ContentSection
            onSubmit={() => setDeep("submit")}
            onTrust={() => setDeep("trust")}
            onRegistry={() => setDeep("registry")}
          />
        </ScrollFade>
      </div>
    </div>
  );
}
