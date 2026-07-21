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
    title: "Confirm Supabase persistence",
    body: "NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. Run migration 045 for production reference lot inventory.",
  },
  {
    n: 3,
    title: "Enable asset monitoring worker",
    body: "ASSET_MONITORING_AUTO_APPLY=true + Vercel cron on GET /api/cron/asset-monitoring.",
  },
  {
    n: 4,
    title: "Run E2E check",
    body: "GET /api/verify/e2e — all steps green including proof-lookup-roundtrip.",
  },
];

export default function VerificationPage() {
  return (
    <RedesignPage maxWidth={960}>
      <PageHeader
        eyebrow="Verification layer"
        title="7/7 production scoreboard"
        subtitle="The cryptographic verify → proof → lookup loop Abraxas is built on. Each item flips live when production keys, persistence, and feeds are configured — no calendar dates."
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
