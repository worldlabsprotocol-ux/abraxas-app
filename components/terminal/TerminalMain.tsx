"use client";
// FILE: components/terminal/TerminalMain.tsx
// State machine + layout. Renders deep views or the main scrolling terminal.
// Every sub-component is imported. No inline definitions, no nested functions.

import { useState, useEffect }      from "react";
import { M, S, G } from "./tokens";
import { FlagshipAssetPage }        from "@/components/assets/FlagshipAssetPage";
import { AssetOwnerOnboarding }     from "@/components/onboarding/AssetOwnerOnboarding";
import { TrustStack }               from "@/components/onboarding/TrustStack";
import { TokenizationRequestModal } from "@/components/TokenizationRequestModal";

import { DeepViewShell }      from "./DeepViewShell";
import { RegistryView }       from "./RegistryView";
import { HeroIntro, HeroPassportTeaser } from "./HeroSection";
import { HowItWorksSteps } from "./HowItWorksSteps";
import { CloveCaseStudy } from "./CloveCaseStudy";
import { OnboardingChoice } from "./OnboardingChoice";
import { WhyVerificationStory } from "./WhyVerificationStory";
import { ZkLoginPreview } from "./ZkLoginPreview";
import { ProtocolVisionSection } from "./ProtocolVisionSection";
import { MilestonesSection }  from "./MilestonesSection";
import { AssetGrid }          from "./AssetGrid";
import { IPAssetGrid }        from "./IPAssetGrid";
import { WorldByHandSection } from "./WorldByHandSection";
import { CoffeeFarmSection }  from "./CoffeeFarmSection";
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
        {/* ACT 1: the compressed story. Hero, how it works, one real
            example, then a clear invitation to keep exploring. This is
            the entrance sign, not the whole museum. */}
        <div id="demo-hero">
          <HeroIntro />
        </div>

        <Divider />

        {/* 2. HOW IT WORKS */}
        <DarkPanel>
          <HowItWorksSteps />
        </DarkPanel>

        <Divider />

        {/* THE FLAGSHIP CASE STUDY, one real asset, before/after, instead
            of leading with six asset classes competing for attention */}
        <DarkPanel>
          <CloveCaseStudy />
        </DarkPanel>

        <Divider />

        {/* ACT DIVIDER: the bridge from "I get it" into the full registry */}
        <div style={{ textAlign:"center", padding:"2rem 1rem" }}>
          <div style={{ fontFamily:M, fontSize:"0.7rem", fontWeight:700,
                         color:"var(--text-muted)", letterSpacing:"0.1em",
                         textTransform:"uppercase", marginBottom:"0.75rem" }}>
            That's the whole idea
          </div>
          <div style={{ fontFamily:S, fontSize:"clamp(1rem,2.2vw,1.25rem)",
                         fontWeight:700, color:"var(--text-primary)",
                         marginBottom:"1rem" }}>
            Everything past here is the same idea, applied to five more
            real things.
          </div>
          <button onClick={() => {
              const el = document.getElementById("demo-assets");
              el?.scrollIntoView({ behavior:"smooth" });
            }}
            style={{ padding:"0.7rem 1.75rem", borderRadius:8, border:"none",
                      background:G, color:"#000", fontFamily:S,
                      fontSize:"0.85rem", fontWeight:700, cursor:"pointer" }}>
            See everything verified →
          </button>
        </div>

        <Divider />

        {/* ACT 2: the fuller registry, for anyone who wants to keep going */}
        {/* 1b. WHAT DO YOU WANT TO DO, plain branching choice, no jargon,
            from the original audit, never built until now */}
        <DarkPanel>
          <OnboardingChoice
            onInvest={() => {
              const el = document.getElementById("demo-assets");
              el?.scrollIntoView({ behavior:"smooth" });
            }}
            onSubmitAsset={() => setDeep("submit")}
            onLookAround={() => {
              const el = document.getElementById("demo-assets");
              el?.scrollIntoView({ behavior:"smooth" });
            }}
          />
        </DarkPanel>

        <Divider />

        {/* 1c. WHY VERIFICATION MATTERS, told as a story, never built until now */}
        <DarkPanel>
          <WhyVerificationStory />
        </DarkPanel>

        <Divider />

        {/* 2b. FEATURED ASSETS, real estate cluster, Naj Tulum and The
            Clove grouped here per the requested ordering */}
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

        {/* 2b2. WORLD BY HAND, second business in tokenization review */}
        <DarkPanel>
          <WorldByHandSection />
        </DarkPanel>

        <Divider />

        {/* 2b3. COFFEE FARM, pending real details before it becomes a
            full listing */}
        <DarkPanel>
          <CoffeeFarmSection />
        </DarkPanel>

        <Divider />

        {/* 2d. FORM A BUSINESS, moved right under Cielo/Featured Assets,
            World Labs and World Wearables follow right after it */}
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

        <ScrollFade>
          <DarkPanel>
            <WorldLabsSection />
          </DarkPanel>
        </ScrollFade>

        <Divider />

        <ScrollFade>
          <DarkPanel>
            <WorldWearablesShop onBuyNow={(item) => setBuyItem(item)} />
          </DarkPanel>
        </ScrollFade>

        <Divider />

        {/* 2c. MUSIC ROYALTY AUDITS */}
        <ScrollFade>
          <div id="demo-music">
            <DarkPanel>
              <MusicSection />
            </DarkPanel>
          </div>
        </ScrollFade>

        <Divider />

        {/* 2e. IP ASSETS, literary and entertainment, separated from
            real estate by Music, real estate stays grouped together above */}
        <ScrollFade>
          <DarkPanel>
            <IPAssetGrid
              onInvest={(assetId) => setInvestAsset(assetId)}
              onBuyNow={(item) => setBuyItem(item)}
            />
          </DarkPanel>
        </ScrollFade>

        <Divider />

        {/* 4. ABRAXAS PASSPORT, theme-aware already, demo video section
            removed entirely, wasn't ready yet */}
        <div id="abraxas-id" />
        <HeroPassportTeaser onGetVerified={() => { window.location.href = "/passport"; }} />

        <Divider />

        {/* ZK LOGIN COMING SOON and PROTOCOL VISION grouped together now,
            both are forward-looking, neither is live today, they shouldn't
            interrupt the live, working proof in the middle of the page */}
        <ZkLoginPreview />

        <Divider />

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
