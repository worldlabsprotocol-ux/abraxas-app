"use client";
// FILE: app/build/page.tsx
// "Build on Abraxas", everything for asset owners who want to form a
// business, tokenize, or sell, moved out of the Marketplace entirely.
// This content was sitting inline in the buyer-facing investment
// scroll, which doesn't make sense, a buyer browsing verified assets
// doesn't need six sections about how to BECOME a seller in between.

import { useState } from "react";
import { S, BDR } from "@/components/terminal/tokens";
import { ScrollFade } from "@/components/terminal/ui";
import { WyomingSection } from "@/components/terminal/WyomingSection";
import type { WyomingTier } from "@/components/terminal/types";
import { WorldLabsSection } from "@/components/terminal/WorldLabsFeature";
import { WorldWearablesGallery, WorldWearablesHoodie } from "@/components/terminal/WorldWearablesShop";
import { WorldByHandSection } from "@/components/terminal/WorldByHandSection";
import { CoffeeFarmSection } from "@/components/terminal/CoffeeFarmSection";
import { BottomNav } from "@/components/BottomNav";
import { LiveBackground } from "@/components/LiveBackground";
import { TokenizationRequestModal } from "@/components/TokenizationRequestModal";
import { BuyNowModal } from "@/components/terminal/BuyNowModal";
import type { BuyItem } from "@/components/terminal/BuyNowModal";

function DarkPanel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background:"#FAFAF8", borderRadius:16,
                   padding:"1.25rem clamp(0.875rem,3vw,1.5rem)",
                   border:`1px solid ${BDR}` }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height:1, background:BDR, margin:"1.5rem 0" }} />;
}

export default function BuildPage() {
  const [wyOpen, setWyOpen] = useState(false);
  const [initialTier, setInitialTier] = useState<WyomingTier | null>(null);
  const [buyItem, setBuyItem] = useState<BuyItem | null>(null);

  return (
    <div style={{ minHeight:"100vh", background:"#FAFAF8", color:"#15151A" }}>
      <LiveBackground />
      <div style={{ padding:"1rem clamp(1rem,3vw,1.5rem)",
                     borderBottom:`1px solid ${BDR}`,
                     display:"flex", alignItems:"center", gap:"0.5rem" }}>
        <svg width={20} height={20} viewBox="0 0 40 40" fill="none">
          <polygon points="20,2 38,20 20,38 2,20" stroke="#10B981" strokeWidth="2" fill="none"/>
          <polygon points="20,8 32,20 20,32 8,20" stroke="#10B981" strokeWidth="1.5" fill="rgba(16,185,129,0.1)"/>
          <circle cx="20" cy="20" r="3" fill="#10B981"/>
        </svg>
        <span style={{ fontFamily:S, fontSize:"0.85rem", fontWeight:700 }}>
          Build on Abraxas
        </span>
      </div>

      <div style={{ maxWidth:860, margin:"0 auto", padding:"1.5rem clamp(0.875rem,3vw,1.5rem)" }}>
        <p style={{ fontFamily:S, fontSize:"0.82rem", color:"rgba(21,21,26,0.5)",
                     lineHeight:1.7, marginBottom:"1.5rem", maxWidth:560 }}>
          For asset owners and operators: form a business, tokenize what
          you own, or see how existing businesses on Abraxas got verified.
          If you're looking to invest in something instead, head back to
          the Marketplace.
        </p>

        <ScrollFade>
          <div id="demo-wyoming">
            <DarkPanel>
              <WyomingSection
                onSelectTier={(tier) => { setInitialTier(tier); setWyOpen(true); }}
                onBrowse={() => { setInitialTier(null); setWyOpen(true); }}
              />
            </DarkPanel>
          </div>
        </ScrollFade>

        <Divider />

        <ScrollFade>
          <DarkPanel>
            <WorldLabsSection onBuyNow={(item) => setBuyItem(item)} />
          </DarkPanel>
        </ScrollFade>

        <Divider />

        <ScrollFade>
          <DarkPanel>
            <WorldWearablesGallery />
          </DarkPanel>
        </ScrollFade>

        <Divider />

        <DarkPanel>
          <WorldWearablesHoodie onBuyNow={(item) => setBuyItem(item)} />
        </DarkPanel>

        <Divider />

        <DarkPanel>
          <WorldByHandSection />
        </DarkPanel>

        <Divider />

        <DarkPanel>
          <CoffeeFarmSection />
        </DarkPanel>
      </div>

      <BottomNav />

      <TokenizationRequestModal
        open={wyOpen}
        initialTier={initialTier}
        onClose={() => { setWyOpen(false); setInitialTier(null); }}
      />
      <BuyNowModal item={buyItem} onClose={() => setBuyItem(null)} />
    </div>
  );
}
