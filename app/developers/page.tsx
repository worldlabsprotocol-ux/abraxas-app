"use client";
// FILE: app/developers/page.tsx
// Public developer portal — docs, APIs, quickstarts, architecture.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import {
  BUILD_FOR_AUDIENCES,
  DEVELOPER_QUICKSTARTS,
  NOT_FOR_AUDIENCES,
} from "@/lib/infrastructurePositioning";
import { ABRAXAS_POSITIONING } from "@/lib/northStar";
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
        eyebrow="Developers"
        title="Build on the trust layer"
        subtitle={ABRAXAS_POSITIONING}
      />

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

      <ContentCard title="Live API endpoints">
        <BulletList items={LIVE_ENDPOINTS} />
        <div style={{ marginTop: "0.75rem" }}>
          <Btn href="/docs" variant="secondary" size="sm">Full documentation →</Btn>
        </div>
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
        <Btn href="/docs/architecture" size="sm">Architecture docs →</Btn>
      </ContentCard>

      <ContentCard title="Who this is for">
        <BulletList items={[...BUILD_FOR_AUDIENCES]} />
      </ContentCard>

      <ContentCard title="Who should not use Abraxas">
        <BulletList items={[...NOT_FOR_AUDIENCES]} />
      </ContentCard>

      <ContentCard title="Integration program">
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.75rem" }}>
          Approved partners receive API keys, sandbox policy IDs, and white-glove onboarding for production relying-party flows.
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
