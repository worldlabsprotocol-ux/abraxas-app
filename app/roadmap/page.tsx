"use client";
// FILE: app/roadmap/page.tsx

import { ProtocolPage } from "@/components/ProtocolPage";
import { PageHeader, ContentCard } from "@/components/content/ProtocolSection";
import { ROADMAP } from "@/lib/protocolContent";

const S = "'Inter',system-ui,-apple-system,sans-serif";

export default function RoadmapPage() {
  return (
    <ProtocolPage maxWidth={820}>
      <PageHeader
        eyebrow="Roadmap"
        title="Where the protocol stands"
        subtitle="Public milestones with honest status labels. Timelines shift when real diligence or partner consent requires it, we prefer accuracy over deadlines."
      />

      {ROADMAP.map(phase => (
        <ContentCard key={phase.phase} title={phase.phase}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {phase.items.map(item => (
              <span key={item} style={{
                padding: "0.35rem 0.75rem",
                borderRadius: 999,
                background: `${phase.color}12`,
                border: `1px solid ${phase.color}30`,
                fontFamily: S,
                fontSize: "0.76rem",
                color: "var(--text-secondary)",
                lineHeight: 1.45,
              }}>
                {phase.phase === "Live now" ? "✓ " : ""}{item}
              </span>
            ))}
          </div>
        </ContentCard>
      ))}
    </ProtocolPage>
  );
}
