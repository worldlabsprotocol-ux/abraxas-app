"use client";
// FILE: app/verification/page.tsx
// Verification layer scoreboard — seven items to production-ready.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { VerificationLayerScoreboard } from "@/components/verification/VerificationLayerScoreboard";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

const BOOTSTRAP_STEPS = [
  {
    n: 1,
    title: "Generate signing keys",
    body: "Run node scripts/generate-abraxas-key.js — paste ABRAXAS_SIGNING_KEY and ABRAXAS_PUBLIC_KEY into Vercel.",
  },
  {
    n: 2,
    title: "Run Supabase migrations 042–045",
    body: "authentication_proofs table + lot inventory. Paste SQL from supabase/migrations/ in Supabase SQL editor.",
  },
  {
    n: 3,
    title: "Bootstrap production",
    body: "GET /api/verify/bootstrap for diagnostics. POST with Authorization: Bearer CRON_SECRET to seed lot inventory.",
  },
  {
    n: 4,
    title: "Confirm E2E",
    body: "GET /api/verify/e2e — all steps green including proof-lookup-roundtrip. Target: /verification shows 7/7.",
  },
];

export default function VerificationPage() {
  return (
    <RedesignPage maxWidth={960}>
      <PageHeader
        eyebrow="Verification layer"
        title="7/7 production scoreboard"
        subtitle="Digital asset verification and blockchain verification for tokenized real-world assets — the cryptographic verify → proof → lookup loop behind the RWA verification app."
      />

      <VerificationLayerScoreboard />

      <section style={{ marginTop: "1.5rem" }}>
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.65rem" }}>
          Bootstrap checklist
        </div>
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {BOOTSTRAP_STEPS.map((step) => (
            <div
              key={step.n}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "0.85rem",
                padding: "0.85rem 1rem",
                borderRadius: 14,
                border: "1px solid var(--border-strong)",
                background: "var(--surface-raised)",
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FONT,
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  background: "rgba(16,185,129,0.15)",
                  color: "var(--accent)",
                  border: "1px solid rgba(16,185,129,0.35)",
                }}
              >
                {step.n}
              </span>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
                  {step.title}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                  {step.body}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </RedesignPage>
  );
}
