"use client";
// FILE: app/developers/page.tsx
// For builders — proof-first, then APIs and architecture.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import {
  BUILD_FOR_AUDIENCES,
  DEVELOPER_QUICKSTARTS,
  NOT_FOR_AUDIENCES,
} from "@/lib/infrastructurePositioning";
import { ABRAXAS_SUBHEAD } from "@/lib/northStar";
import { BUILDER_PROOF_EXAMPLES, RELYING_PARTY_NORTH_STAR } from "@/lib/positioningStrategy";
import { INTEGRATION_SDK_SNIPPET } from "@/lib/protocolIntegrations";
import { DOCS_SECTIONS } from "@/lib/protocolContent";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const LIVE_ENDPOINTS = [
  "POST /api/credentials/verify — relying party JWT verify",
  "GET /api/credentials/public-key — JWKS for offline verify",
  "GET /api/trust/status?sui=0x… — wallet + credential summary",
  "POST /api/v1/verification-requests — partner consent flow (API key)",
  "POST /api/v1/policies/evaluate — policy engine (approved partners)",
  "GET /api/trust/registry — issuers + credential schemas",
  "POST /api/verification/check-level — hybrid IDV gate",
  "GET /api/sui/passport — Passport read",
];

export default function DevelopersPage() {
  return (
    <RedesignPage maxWidth={900}>
      <PageHeader
        eyebrow="For builders"
        title="Build with Passport"
        subtitle={ABRAXAS_SUBHEAD}
      />

      <ContentCard title="Real proof — saved engineering time">
        <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.85rem" }}>
          {RELYING_PARTY_NORTH_STAR}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "0.55rem", marginBottom: "0.75rem" }}>
          {BUILDER_PROOF_EXAMPLES.map(ex => (
            <Link
              key={ex.name}
              href={ex.href}
              style={{
                display: "block",
                padding: "0.85rem 1rem",
                borderRadius: 12,
                border: "1px solid rgba(16,185,129,0.28)",
                background: "rgba(16,185,129,0.06)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.3rem" }}>
                {ex.name} →
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>
                {ex.outcome}
              </p>
            </Link>
          ))}
        </div>
        <Btn href="/integrate" size="sm">Integrate overview →</Btn>
      </ContentCard>

      <ContentCard title="Quickstarts">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "0.65rem" }}>
          {DEVELOPER_QUICKSTARTS.map(q => (
            <Link
              key={q.href}
              href={q.href}
              style={{
                display: "block",
                padding: "1rem",
                borderRadius: 12,
                border: "1px solid var(--border-strong)",
                background: "var(--surface-raised)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                {q.title} →
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>
                {q.desc}
              </p>
            </Link>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Example integration">
        <pre
          style={{
            fontFamily: MONO,
            fontSize: "0.62rem",
            lineHeight: 1.55,
            padding: "1rem",
            borderRadius: 12,
            overflow: "auto",
            background: "#06090B",
            border: "1px solid var(--border-strong)",
            color: "var(--text-secondary)",
            margin: "0 0 0.75rem",
          }}
        >
          {INTEGRATION_SDK_SNIPPET}
        </pre>
        <Btn href="/docs/sui" size="sm">Sui integration hub →</Btn>
      </ContentCard>

      <ContentCard title="Architecture & trust model">
        {DOCS_SECTIONS.slice(0, 4).map(section => (
          <div key={section.title} style={{ marginBottom: "0.85rem" }}>
            <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              {section.title}
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
              {section.body}
            </p>
          </div>
        ))}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/docs/architecture" size="sm">Architecture docs →</Btn>
          <Btn href="/trust-framework#trust-over-time" variant="secondary" size="sm">
            Trust over time (TTL & refresh) →
          </Btn>
        </div>
      </ContentCard>

      <ContentCard title="Live API endpoints">
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 0.65rem" }}>
          Technical reference for approved partners. Start with quickstarts and proof examples above.
        </p>
        <BulletList items={LIVE_ENDPOINTS} />
        <div style={{ marginTop: "0.75rem" }}>
          <Btn href="/docs" variant="secondary" size="sm">Full documentation →</Btn>
        </div>
      </ContentCard>

      <ContentCard title="Who this is for">
        <BulletList items={[...BUILD_FOR_AUDIENCES]} />
      </ContentCard>

      <ContentCard title="Who should not use Abraxas">
        <BulletList items={[...NOT_FOR_AUDIENCES]} />
      </ContentCard>

      <ContentCard title="Integration program">
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.75rem" }}>
          Design partners receive API keys, sandbox policy IDs, and white-glove onboarding. Self-serve opens after audits and the first unaffiliated relying party proof.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/design-partner" size="sm">Apply →</Btn>
          <Btn href="/integrate" variant="secondary" size="sm">Integrate overview →</Btn>
          <Btn href="/developers/partner" variant="ghost" size="sm">Partner dashboard →</Btn>
        </div>
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginBottom: "2rem" }}>
        <Btn href="/docs/ail" size="lg">Read the AIL spec →</Btn>
        <Btn href="/integrate" variant="secondary" size="lg">Integrate Abraxas →</Btn>
      </div>
    </RedesignPage>
  );
}
