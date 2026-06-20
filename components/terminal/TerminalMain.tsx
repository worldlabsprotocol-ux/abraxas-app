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
import { HeroIntro, HeroPassportTeaser } from "./HeroSection";
import { HowItWorksSteps } from "./HowItWorksSteps";
import { DemoVideoSection } from "./DemoVideoSection";
import { ZkLoginPreview } from "./ZkLoginPreview";
import { ProtocolVisionSection } from "./ProtocolVisionSection";
import { MilestonesSection }  from "./MilestonesSection";
import { AssetGrid }          from "./AssetGrid";
import { WyomingSection }     from "./WyomingSection";
import { WorldLabsSection } from "./WorldLabsFeature";
import { WorldWearablesShop } from "./WorldWearablesShop";
import { MusicSection }       from "./MusicSection";
import { PartnersSection }    from "./PartnersSection";
import { FAQSection }         from "./FAQSection";
import { ContentSection }     from "./ContentSection";
import { InvestorPortalModal} from "./InvestorPortalModal";
import { BuyNowModal }        from "./BuyNowModal";
import type { BuyItem }       from "./BuyNowModal";
import { Divider, ScrollFade } from "./ui";

import type { DeepView, WyomingTier } from "./types";

const MAX_WIDTH: React.CSSProperties = {
  maxWidth: 1060,
  margin: "0 auto",
  padding: "1rem clamp(0.75rem,2.5vw,1.5rem) 0.75rem",
};

// Fixed-dark wrapper, deliberately NOT theme-aware. Every section below
// was built with white/light text on a dark background. Rather than
// retrofit dozens of individual color references across multiple files
// (the exact kind of sweeping edit that has caused real bugs before),
// each section gets wrapped in a guaranteed-dark panel so its existing
// text stays readable in both light and dark page mode. This is the
// same "dark card floating on a light canvas" pattern fintech apps use
// deliberately, not a workaround, an actual design choice.
function DarkPanel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background:"#0A0C10", borderRadius:16,
                   padding:"1.25rem clamp(0.875rem,3vw,1.5rem)",
                   border:"1px solid #1C2333" }}>
      {children}
    </div>
  );
}

export function TerminalMain() {
  const [deep,        setDeep]        = useState<DeepView>("main");
  const [wyOpen,      setWyOpen]      = useState(false);
  const [initialTier, setInitialTier] = useState<WyomingTier | null>(null);
  const [investAsset, setInvestAsset] = useState<string | null>(null);
  const [buyItem,     setBuyItem]     = useState<BuyItem | null>(null);

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

      <BuyNowModal
        item={buyItem}
        onClose={() => setBuyItem(null)}
      />

      <div style={MAX_WIDTH}>
        {/* 1. INTRO + PROOF STATS (4 verified assets, $1.6M attested) */}
        {/* Theme-aware already, no DarkPanel needed */}
        <div id="demo-hero">
          <HeroIntro />
        </div>

        <Divider />

        {/* 2. HOW IT WORKS */}
        <DarkPanel>
          <HowItWorksSteps />
        </DarkPanel>

        <Divider />

        {/* 2b. FEATURED ASSETS, moved up right after How It Works, the
            real proof should come early, not after eight other sections */}
        <ScrollFade>
          <div id="demo-assets">
            <DarkPanel>
              <AssetGrid
                onViewRegistry={() => setDeep("registry")}
                onInvest={(assetId) => setInvestAsset(assetId)}
                onBuyNow={(item) => setBuyItem(item)}
              />
            </DarkPanel>
          </div>
        </ScrollFade>

        <Divider />

        {/* 2c. MUSIC ROYALTY AUDITS, moved up next to Featured Assets,
            D-9 as the first real artist deserves to be seen early, not
            buried after eight other sections */}
        <ScrollFade>
          <div id="demo-music">
            <DarkPanel>
              <MusicSection />
            </DarkPanel>
          </div>
        </ScrollFade>

        <Divider />

        {/* 3. SEE IT IN ACTION, demo video placeholder */}
        <DarkPanel>
          <DemoVideoSection />
        </DarkPanel>

        <Divider />

        {/* 4. ABRAXAS PASSPORT, theme-aware already, moved up right after
            the demo video per the requested flow */}
        <div id="abraxas-id" />
        <HeroPassportTeaser onGetVerified={() => { window.location.href = "/passport"; }} />

        <Divider />

        {/* 5. ZK LOGIN COMING SOON */}
        <ZkLoginPreview />

        <Divider />

        {/* 6. FORM A BUSINESS, generic explainer + pricing tiers, no
            longer bundled with World Labs */}
        <ScrollFade>
          <div id="demo-wyoming">
            <DarkPanel>
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
            </DarkPanel>
          </div>
        </ScrollFade>

        <Divider />

        {/* 6b. WORLD LABS, standalone proof-of-concept, the actual
            business case study, separate from the generic explainer above */}
        <ScrollFade>
          <DarkPanel>
            <WorldLabsSection />
          </DarkPanel>
        </ScrollFade>

        <Divider />

        {/* 6c. WORLD WEARABLES, completely standalone product line,
            no longer nested under World Labs */}
        <ScrollFade>
          <DarkPanel>
            <WorldWearablesShop onBuyNow={(item) => setBuyItem(item)} />
          </DarkPanel>
        </ScrollFade>

        <Divider />

        {/* 7. PROTOCOL VISION + READY TO START */}
        <DarkPanel>
          <ProtocolVisionSection
            onGetStarted={() => { window.location.href = "/terminal?signin=1"; }}
          />
        </DarkPanel>

        <Divider />

        {/* 8. ACTIVE DEAL PIPELINE, moved to the end per the requested flow */}
        <div id="demo-deals">
          <DarkPanel>
            <ContentSection
              onSubmit={() => setDeep("submit")}
              onTrust={() => setDeep("trust")}
            />
          </DarkPanel>
        </div>

        <Divider />

        {/* 10. PROTOCOL MILESTONES */}
        <div id="demo-milestones">
          <DarkPanel>
            <MilestonesSection />
          </DarkPanel>
        </div>

        <Divider />

        <ScrollFade>
          <DarkPanel>
            <PartnersSection />
          </DarkPanel>
        </ScrollFade>

        <Divider />

        <DarkPanel>
          <FAQSection />
        </DarkPanel>
      </div>
    </div>
  );
}
