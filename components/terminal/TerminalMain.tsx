"use client";
// FILE: components/terminal/TerminalMain.tsx
// State machine + layout. Renders deep views or the main scrolling terminal.

import { useState, useEffect }      from "react";
import { M, S, G } from "./tokens";
import { FlagshipAssetPage }        from "@/components/assets/FlagshipAssetPage";
import { AssetOwnerOnboarding }     from "@/components/onboarding/AssetOwnerOnboarding";
import { TrustStack }               from "@/components/onboarding/TrustStack";

import { DeepViewShell }      from "./DeepViewShell";
import { RegistryView }       from "./RegistryView";
import { HeroIntro, HeroPassportTeaser } from "./HeroSection";
import { CloveCaseStudy } from "./CloveCaseStudy";
import { ProtocolVisionSection } from "./ProtocolVisionSection";
import { MilestonesSection }  from "./MilestonesSection";
import { AssetGrid }          from "./AssetGrid";
import { MusicSection }       from "./MusicSection";
import { PartnersSection }    from "./PartnersSection";
import { VerificationPackages } from "./VerificationPackages";
import { FAQSection }         from "./FAQSection";
import { SiteFooter }         from "@/components/SiteFooter";
import { InvestorPortalModal} from "./InvestorPortalModal";
import { BuyNowModal }        from "./BuyNowModal";
import type { BuyItem }       from "./BuyNowModal";
import { Divider, ScrollFade, Panel } from "./ui";

import type { DeepView } from "./types";

const MAX_WIDTH: React.CSSProperties = {
  maxWidth: 1060,
  margin: "0 auto",
  padding: "1rem clamp(0.75rem,2.5vw,1.5rem) 0.75rem",
};

export function TerminalMain() {
  const [deep,        setDeep]        = useState<DeepView>("main");
  const [investAsset, setInvestAsset] = useState<string | null>(null);
  const [buyItem,     setBuyItem]     = useState<BuyItem | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  function goMain() { setDeep("main"); }

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

  return (
    <div>
      <InvestorPortalModal
        assetId={investAsset}
        onClose={() => setInvestAsset(null)}
      />

      <BuyNowModal
        item={buyItem}
        onClose={() => setBuyItem(null)}
      />

      <div style={MAX_WIDTH}>
        <div id="demo-hero">
          <HeroIntro />
        </div>

        <Divider />

        <div id="abraxas-id" />
        <HeroPassportTeaser onGetVerified={() => { window.location.href = "/passport"; }} />

        <Divider />

        <ScrollFade>
          <Panel>
            <PartnersSection />
          </Panel>
        </ScrollFade>

        <Divider />

        <Panel glow>
          <VerificationPackages />
        </Panel>

        <Divider />

        <Panel>
          <CloveCaseStudy />
        </Panel>

        <Divider />

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
            style={{
              padding:"0.75rem 1.75rem", borderRadius:999, border:"none",
              background:G, color:"#000", fontFamily:S,
              fontSize:"0.85rem", fontWeight:700, cursor:"pointer",
              boxShadow:`0 0 0 1px ${G}55, 0 0 24px ${G}30`,
            }}>
            See everything verified →
          </button>
        </div>

        <Divider />

        <ScrollFade>
          <div id="demo-assets">
            <Panel glow>
              <AssetGrid
                onViewRegistry={() => setDeep("registry")}
                onViewFlagship={() => setDeep("asset")}
                onInvest={(assetId) => setInvestAsset(assetId)}
                onBuyNow={(item) => setBuyItem(item)}
              />
            </Panel>
          </div>
        </ScrollFade>

        <Divider />

        <Panel>
          <div style={{ display:"flex", justifyContent:"space-between",
                         alignItems:"center", flexWrap:"wrap", gap:"0.875rem" }}>
            <div>
              <div style={{ fontFamily:M, fontSize:"0.95rem", fontWeight:700,
                             color:"var(--text-primary)" }}>
                Have something to tokenize?
              </div>
              <div style={{ fontFamily:S, fontSize:"0.76rem",
                             color:"var(--text-muted)", marginTop:"0.25rem" }}>
                Form a business, see World Labs's case study, or browse
                World Wearables.
              </div>
            </div>
            <a href="/build"
              style={{
                padding:"0.65rem 1.35rem", borderRadius:999, border:"none",
                background:G, color:"#000", fontFamily:S,
                fontSize:"0.8rem", fontWeight:700, textDecoration:"none",
                whiteSpace:"nowrap",
                boxShadow:`0 0 20px ${G}28`,
              }}>
              Build on Abraxas →
            </a>
          </div>
        </Panel>

        <Divider />

        <ScrollFade>
          <div id="demo-music">
            <Panel>
              <MusicSection />
            </Panel>
          </div>
        </ScrollFade>

        <Divider />

        <Panel>
          <ProtocolVisionSection
            onGetStarted={() => { window.location.href = "/terminal?signin=1"; }}
          />
        </Panel>

        <Divider />

        <div id="demo-milestones">
          <Panel>
            <MilestonesSection />
          </Panel>
        </div>

        <Divider />

        <Panel>
          <FAQSection />
        </Panel>
      </div>
      <SiteFooter />
    </div>
  );
}
