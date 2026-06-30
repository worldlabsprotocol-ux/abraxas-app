"use client";
// FILE: app/build/page.tsx
// Build on Abraxas — Wyoming LLC packages + World Labs blueprint.
// Slimmed to the core owner funnel: form → verify → tokenize.

import { useState } from "react";
import { S, BDR } from "@/components/terminal/tokens";
import { ScrollFade } from "@/components/terminal/ui";
import { WyomingSection } from "@/components/terminal/WyomingSection";
import type { WyomingTier } from "@/components/terminal/types";
import { WorldLabsSection } from "@/components/terminal/WorldLabsFeature";
import { RedesignShell } from "@/components/redesign/RedesignShell";
import { RedesignFooter } from "@/components/redesign/RedesignFooter";
import { TokenizationRequestModal } from "@/components/TokenizationRequestModal";
import { BuyNowModal } from "@/components/terminal/BuyNowModal";
import type { BuyItem } from "@/components/terminal/BuyNowModal";

function DarkPanel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background:"var(--surface)", borderRadius:16,
                   padding:"1.25rem clamp(0.875rem,3vw,1.5rem)",
                   border:`1px solid ${BDR}`,
                   boxShadow:"var(--shadow-card)" }}>
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
    <RedesignShell>
      <div style={{ maxWidth:860, margin:"0 auto", padding:"1.5rem clamp(0.875rem,3vw,1.5rem)" }}>
        <p style={{ fontFamily:S, fontSize:"0.82rem", color:"var(--text-secondary)",
                     lineHeight:1.7, marginBottom:"1.5rem", maxWidth:560 }}>
          Form a Wyoming LLC, get fully verified via zkLogin on Sui, and tokenize what you own.
          World Labs is the blueprint — Cielo Sunrise is the proof asset.
          Investors browse verified assets on the Marketplace.
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
      </div>

      <TokenizationRequestModal
        open={wyOpen}
        initialTier={initialTier}
        onClose={() => { setWyOpen(false); setInitialTier(null); }}
      />
      <BuyNowModal item={buyItem} onClose={() => setBuyItem(null)} />
      <RedesignFooter />
    </RedesignShell>
  );
}
