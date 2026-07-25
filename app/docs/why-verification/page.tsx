"use client";
// FILE: app/docs/why-verification/page.tsx

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import {
  KYC_DEBT_HEADLINE,
  KYC_BARRIERS,
  ABRAXAS_SOLUTION_STEPS,
  HYBRID_ARCHITECTURE_SUMMARY,
} from "@/lib/kycThesis";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export default function WhyVerificationPage() {
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="Technical thesis"
        title="Why unified KYC is hard for RWAs. and how Abraxas solves it"
        subtitle={KYC_DEBT_HEADLINE}
      />

      <ContentCard title="Why this problem has been hard">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {KYC_BARRIERS.map(b => (
            <div key={b.title}>
              <div style={{ fontFamily: FONT, fontSize: "0.84rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                {b.title}
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
                {b.body}
              </p>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="How Abraxas solves it technically">
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {ABRAXAS_SOLUTION_STEPS.map(s => (
            <div key={s.step} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.75rem" }}>
              <span style={{ fontFamily: FONT, fontWeight: 800, color: "#10B981" }}>{s.step}.</span>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.84rem", fontWeight: 700, color: "var(--text-primary)" }}>{s.title}</div>
                <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "4px 0 0" }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Hybrid architecture">
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.75rem" }}>
          {HYBRID_ARCHITECTURE_SUMMARY}
        </p>
        <BulletList items={[
          "Sui: zkLogin, W3C credentials, Move Passport, USDC settlement",
          "Solana: $ABRA optional access tiers. verification is not gated",
          "Credentials are portable by W3C standard. verify signature anywhere",
        ]} />
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/docs/credential-portability" size="lg">Integrator API →</Btn>
        <Btn href="/docs/chain" variant="secondary" size="lg">Chain architecture</Btn>
        <Btn href="/passport" variant="ghost" size="lg">Create passport</Btn>
      </div>
    </RedesignPage>
  );
}
