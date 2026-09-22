"use client";
// FILE: app/investors/page.tsx
// Investor data room hub. structured like ChatGPT audit categories.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { DATA_ROOM_SECTIONS, LEADING_INDICATORS } from "@/lib/investorDataRoom";
import { LITEPAPER } from "@/lib/protocolLitepaper";
import { INVESTOR_PROOF_MAP, INVESTOR_PROOF_STATUS_LABEL } from "@/lib/investorProofMap";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export default function InvestorsPage() {
  return (
    <RedesignPage accent="home" maxWidth={900}>
      <PageHeader
        eyebrow="Investors"
        title="Data room"
        subtitle="A current proof map for investors and design partners. Each capability has a visible status, an evidence path, and the next gate before broader use."
      />

      <div style={{ display: "grid", gap: "0.75rem", marginBottom: "2rem" }}>
        {INVESTOR_PROOF_MAP.map((proof) => (
          <ContentCard key={proof.id} title={proof.title}>
            <p style={{ fontFamily: FONT, fontWeight: 700, color: ACCENT, margin: "0 0 0.4rem" }}>
              {INVESTOR_PROOF_STATUS_LABEL[proof.status]}
            </p>
            <p style={{ fontFamily: FONT, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.5rem" }}>{proof.detail}</p>
            <p style={{ fontFamily: FONT, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.5rem" }}>
              <strong>Next proof:</strong> {proof.nextGate}
            </p>
            <Link href={proof.evidenceHref} style={{ color: ACCENT, fontWeight: 700 }}>Inspect evidence →</Link>
          </ContentCard>
        ))}
      </div>

      <ContentCard title="North star">
        <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.75rem" }}>
          {LITEPAPER.northStar.body}
        </p>
        <div style={{
          padding: "0.85rem 1rem", borderRadius: 12,
          background: `${ACCENT}10`, border: `1px solid ${ACCENT}33`,
          fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700, color: ACCENT,
        }}>
          {LITEPAPER.northStar.metric}
        </div>
      </ContentCard>

      <div style={{ display: "grid", gap: "1.25rem", marginBottom: "2rem" }}>
        {DATA_ROOM_SECTIONS.map(section => (
          <ContentCard key={section.title} title={section.title}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {section.items.map(item => (
                <Link key={item.href} href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  style={{
                    display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem",
                    padding: "0.65rem 0", borderBottom: "1px solid var(--border)",
                    textDecoration: "none", color: "inherit",
                  }}>
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {item.label}
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                      {item.desc}
                    </div>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: ACCENT, alignSelf: "center" }}>→</span>
                </Link>
              ))}
            </div>
          </ContentCard>
        ))}
      </div>

      <ContentCard title="Milestone sequence">
        <ol style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.8, margin: 0, paddingLeft: "1.25rem" }}>
          <li><strong style={{ color: "var(--text-primary)" }}>Technical proof:</strong> Sandbox holder consent, public receipt verification, durable one-time presentation, and local partner-owned gates.</li>
          <li><strong style={{ color: "var(--text-primary)" }}>External proof:</strong> Human testnet deployment, independent chain observation, and an unaffiliated partner integration.</li>
          <li><strong style={{ color: "var(--text-primary)" }}>Commercial proof:</strong> Measured partner usage and revenue, separately from sandbox activity.</li>
        </ol>
      </ContentCard>

      <ContentCard title="Leading indicators we track">
        <ul style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: 0, paddingLeft: "1.1rem" }}>
          {LEADING_INDICATORS.map(i => <li key={i}>{i}</li>)}
        </ul>
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/investors/strategy" size="lg">Strategic roadmap →</Btn>
        <Btn href="/docs/litepaper" variant="secondary" size="lg">Read litepaper</Btn>
        <Btn href="/investors/pitch" variant="secondary" size="lg">Pitch deck</Btn>
        <Btn href="/metrics" variant="ghost" size="lg">Operational metrics</Btn>
        <Btn href="/integrations/relying-parties" variant="ghost" size="lg">Relying parties</Btn>
        <Btn href="/case-studies/cielo" variant="ghost" size="lg">Cielo case study</Btn>
      </div>
    </RedesignPage>
  );
}
