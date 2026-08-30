"use client";
// FILE: app/integrations/page.tsx
// External protocol integration hub + design partner applications.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import {
  PROTOCOL_INTEGRATIONS,
  INTEGRATION_SDK_SNIPPET,
  STATUS_LABEL,
  STATUS_COLOR,
  type IntegrationStatus,
} from "@/lib/protocolIntegrations";
import {
  INTEGRATIONS_APPLY_NOTE,
  INTEGRATIONS_HUB_SUBHEAD,
  INTEGRATIONS_SDK_NOTE,
  PARTNER_APPLICATION_PATH,
  PARTNER_RECEIPT_DOCS_ANCHOR,
  PARTNER_RECEIPT_VERIFIER_PATH,
} from "@/lib/integrate/partnerJourney";
import { DesignPartnerApplicationForm } from "@/components/integrations/DesignPartnerApplicationForm";
import { PartnerOnboardingPositioningPanel } from "@/components/integrate/PartnerOnboardingPositioningPanel";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export default function IntegrationsPage() {
  const liveCount = PROTOCOL_INTEGRATIONS.filter(p => p.status === "live").length;

  const preBlockStyle: React.CSSProperties = {
    fontFamily: MONO,
    fontSize: "0.68rem",
    lineHeight: 1.6,
    padding: "1rem",
    borderRadius: 10,
    overflowX: "auto",
    overflowY: "hidden",
    maxWidth: "100%",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    margin: "0 0 0.75rem",
  };

  return (
    <RedesignPage maxWidth={900}>
      <PageHeader
        eyebrow="Integrations"
        title="The reusable verification primitive"
        subtitle={INTEGRATIONS_HUB_SUBHEAD}
      />

      <div style={{
        marginBottom: "1.25rem",
        padding: "1rem 1.1rem",
        borderRadius: 14,
        border: `1px solid ${ACCENT}44`,
        background: `${ACCENT}10`,
        maxWidth: "100%",
      }}>
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.75rem" }}>
          <strong style={{ color: "var(--text-primary)" }}>{INTEGRATIONS_APPLY_NOTE}</strong>
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href={PARTNER_APPLICATION_PATH} size="sm">Apply for manual review</Btn>
          <Btn href="/docs/partner-flow" variant="secondary" size="sm">Partner Flow docs</Btn>
          <Btn href={PARTNER_RECEIPT_DOCS_ANCHOR} variant="ghost" size="sm">Receipt verification</Btn>
        </div>
      </div>

      <PartnerOnboardingPositioningPanel />

      <ContentCard title="Relying party program">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 0.75rem" }}>
          The network-effect milestone: an unaffiliated lender, marketplace, or protocol checks Abraxas credentials in production.
          Partners configure eligibility rules. Abraxas returns <strong>approved / denied / manual review</strong> with consent receipts and audit references.
        </p>
        <Btn href="/integrations/relying-parties" size="sm">Relying party onboarding →</Btn>
        <Btn href="/integrations/outreach" variant="secondary" size="sm">Outreach templates</Btn>
      </ContentCard>

      <div id="policy-engine">
      <ContentCard title="Policy Engine">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 0.65rem" }}>
          Partners define required claims (identity, screening, wallet binding, accreditation) with assurance levels and max age.
          The engine evaluates live claim status. not a static profile. and logs every decision.
        </p>
        <BulletList items={[
          "Seeded policies: abraxas-core-v1, abraxas-booking-v1, abraxas-rwa-us-v1",
          "POST /api/v1/policies/evaluate. direct evaluation",
          "GET /api/v1/decisions/{id}/status. re-check before settlement",
        ]} />
      </ContentCard>
      </div>

      <div id="trust-registry">
      <ContentCard title="Trust Registry">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 0.65rem" }}>
          A credential is only valuable if the verifier trusts the issuer. Abraxas maintains which issuers may sign which claim types,
          with assurance tiers, jurisdictions, and audit status.
        </p>
        <BulletList items={[
          "GET /api/trust/registry. issuers + W3C schema identifiers",
          "Veriff · Abraxas Network · Manual Review · Screening (partner-gated)",
          "Issuer suspension and schema versioning",
        ]} />
        <Btn href="/api/trust/registry" size="sm" variant="secondary">View registry JSON →</Btn>
      </ContentCard>
      </div>

      <ContentCard title="Quick integration">
        <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.55, margin: "0 0 0.65rem" }}>
          {INTEGRATIONS_SDK_NOTE}
        </p>
        <pre style={preBlockStyle}>
          {INTEGRATION_SDK_SNIPPET}
        </pre>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/docs/partner-flow" size="sm">Partner Flow docs</Btn>
          <Btn href={PARTNER_RECEIPT_DOCS_ANCHOR} size="sm" variant="secondary">Receipt verification</Btn>
          <Btn href="/docs/architecture" variant="tertiary" size="sm">Architecture</Btn>
        </div>
      </ContentCard>

      <ContentCard title={`Integration registry (${liveCount} pilot surfaces)`}>
        {PROTOCOL_INTEGRATIONS.map(p => (
          <div key={p.id} style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
            padding: "0.85rem 0",
            borderBottom: "1px solid var(--border)",
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>{p.name}</span>
                <span style={{
                  fontFamily: FONT, fontSize: "0.58rem", fontWeight: 700,
                  padding: "0.15rem 0.45rem", borderRadius: 6,
                  color: STATUS_COLOR[p.status as IntegrationStatus],
                  background: `${STATUS_COLOR[p.status as IntegrationStatus]}18`,
                }}>
                  {STATUS_LABEL[p.status as IntegrationStatus]}
                </span>
                <span style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)" }}>{p.category}</span>
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0.35rem 0 0" }}>
                {p.description}
              </p>
              {p.api && (
                <code style={{
                  fontFamily: MONO,
                  fontSize: "0.62rem",
                  color: ACCENT,
                  display: "block",
                  marginTop: "0.35rem",
                  overflowX: "auto",
                  maxWidth: "100%",
                  wordBreak: "break-all",
                }}>
                  {p.api}
                </code>
              )}
              {(p.href || p.website) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginTop: "0.45rem" }}>
                  {p.href && (
                    <Link href={p.href} style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 600, color: ACCENT, textDecoration: "none" }}>
                      Pilot page →
                    </Link>
                  )}
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noopener noreferrer" style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", textDecoration: "none" }}>
                      Website ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </ContentCard>

      <div id="apply" style={{ scrollMarginTop: 96 }}>
      <ContentCard title="Become a design partner">
        <DesignPartnerApplicationForm />
      </ContentCard>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/investors/pitch" size="lg">Pitch deck →</Btn>
        <Btn href="/ops/cielo-e2e" variant="secondary" size="lg">Cielo E2E check</Btn>
        <Link href="/investors" style={{ fontFamily: FONT, fontSize: "0.82rem", color: ACCENT, alignSelf: "center" }}>Data room →</Link>
      </div>
    </RedesignPage>
  );
}
