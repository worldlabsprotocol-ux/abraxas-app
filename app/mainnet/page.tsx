"use client";
// FILE: app/mainnet/page.tsx
// Public mainnet readiness scoreboard.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { MainnetScoreboard } from "@/components/mainnet/MainnetScoreboard";
import { SuiMainnetDeployPanel } from "@/components/mainnet/SuiMainnetDeployPanel";
import { MAINNET_CURRENT_STAGE } from "@/lib/mainnetReadiness";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export default function MainnetPage() {
  return (
    <RedesignPage maxWidth={960}>
      <PageHeader
        eyebrow="Mainnet readiness"
        title="Scoreboard"
        subtitle="Seven boolean gates before open, self-serve, audit-complete mainnet. No calendar dates. only shipped proof."
      />

      <div
        style={{
          marginBottom: "1.25rem",
          padding: "1rem 1.15rem",
          borderRadius: 16,
          border: "1px solid rgba(59,130,246,0.35)",
          background: "rgba(59,130,246,0.08)",
        }}
      >
        <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "#60A5FA", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
          Sui mainnet. not Solana
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
          Abraxas verification (Passport, credentials, proofs) runs on <strong style={{ color: "var(--text-primary)" }}>Sui</strong>.
          Older Solana vault/mint UI in the repo is legacy. not what these gates measure.
          Passport Move package is on Sui devnet today; mainnet deploy is gate #3 after audit.
        </p>
      </div>

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

      <SuiMainnetDeployPanel />

      <MainnetScoreboard variant="full" />
    </RedesignPage>
  );
}
