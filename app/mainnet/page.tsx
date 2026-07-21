"use client";
// FILE: app/mainnet/page.tsx
// Public mainnet readiness scoreboard.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { MainnetScoreboard } from "@/components/mainnet/MainnetScoreboard";
import { MAINNET_CURRENT_STAGE } from "@/lib/mainnetReadiness";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export default function MainnetPage() {
  return (
    <RedesignPage maxWidth={960}>
      <PageHeader
        eyebrow="Mainnet readiness"
        title="Scoreboard"
        subtitle="Seven boolean gates before open, self-serve, audit-complete mainnet. No calendar dates — only shipped proof."
      />

      <div
        style={{
          marginBottom: "1.25rem",
          padding: "1rem 1.15rem",
          borderRadius: 16,
          border: "1px solid var(--border-strong)",
          background: "var(--surface-raised)",
        }}
      >
        <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
          {MAINNET_CURRENT_STAGE.label}
        </div>
        <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
          {MAINNET_CURRENT_STAGE.stage}
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
          {MAINNET_CURRENT_STAGE.body}
        </p>
      </div>

      <MainnetScoreboard variant="full" />
    </RedesignPage>
  );
}
