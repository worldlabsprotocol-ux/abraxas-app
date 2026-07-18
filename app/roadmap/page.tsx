"use client";
// FILE: app/roadmap/page.tsx

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { ROADMAP } from "@/lib/protocolContent";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export default function RoadmapPage() {
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="Roadmap"
        title="Where the protocol stands"
        subtitle="Core verification is live in production. The remaining work is focused — final mainnet gates for Sui Passport, automated monitoring, and external relying party proof."
      />
      {ROADMAP.map(phase => (
        <ContentCard key={phase.phase} title={phase.phase}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {phase.items.map(item => (
              <span key={item} style={{
                padding: "0.35rem 0.75rem", borderRadius: 999,
                background: `${phase.color}12`, border: `1px solid ${phase.color}30`,
                fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.45,
              }}>
                {phase.phase === "Live now" ? "✓ " : ""}{item}
              </span>
            ))}
          </div>
        </ContentCard>
      ))}
    </RedesignPage>
  );
}
