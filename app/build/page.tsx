"use client";
// FILE: app/build/page.tsx
// Build — one question: How do I onboard my business?

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
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

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
        <div style={{ marginBottom: "1.5rem", maxWidth: 560 }}>
          <div style={{
            fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: ACCENT, marginBottom: "0.45rem",
          }}>
            Build on Abraxas
          </div>
          <h1 style={{
            fontFamily: FONT, fontSize: "clamp(1.35rem, 3.5vw, 1.85rem)", fontWeight: 800,
            letterSpacing: "-0.03em", color: "var(--text-primary)", margin: "0 0 0.5rem",
          }}>
            Onboard your business
          </h1>
          <p style={{ fontFamily: FONT, fontSize: "0.85rem", color: "var(--text-secondary)",
                       lineHeight: 1.7, margin: "0 0 0.75rem" }}>
            Form an entity, verify once on Passport, and publish to the registry. Operators integrate once — your proof travels.
          </p>
          <Btn href="/portal/apply" size="sm">Launch listing now →</Btn>
        </div>

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
