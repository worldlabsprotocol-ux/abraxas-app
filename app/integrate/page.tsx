"use client";
// FILE: app/integrate/page.tsx
// Integrate Abraxas — tokenization platforms & embedded finance.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { PartnerExecutionCards } from "@/components/partners/PartnerExecutionCards";
import {
  ABRAXAS_EMBED_PITCH,
  ABRAXAS_INFRA_NARRATIVE,
  ABRAXAS_INFRA_POSITIONING,
  BUILD_FOR_AUDIENCES,
  INTEGRATE_CAPABILITIES,
  NOT_FOR_AUDIENCES,
  RWA_STACK_LAYERS,
} from "@/lib/infrastructurePositioning";
import { INTEGRATION_SDK_SNIPPET } from "@/lib/protocolIntegrations";
import { INTEGRATE_COUNTERPARTY_TRUST } from "@/lib/trustTransfer";
import { TRUST_IS_TIME_BOUND_HEADLINE, TRUST_VERIFY_ONCE_HONEST } from "@/lib/trustOverTime";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export default function IntegratePage() {
  return (
    <RedesignPage maxWidth={880}>
      <PageHeader
        eyebrow="Integrate Abraxas"
        title="Embed trust — don't rebuild it"
        subtitle={ABRAXAS_EMBED_PITCH}
      />

      <ContentCard title="The category">
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.65rem" }}>
          {ABRAXAS_INFRA_NARRATIVE}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: 0 }}>
          {ABRAXAS_INFRA_POSITIONING}
        </p>
      </ContentCard>

      <ContentCard title="Where Abraxas sits">
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {RWA_STACK_LAYERS.map(layer => (
            <div
              key={layer.id}
              style={{
                padding: "0.75rem 0.9rem",
                borderRadius: 10,
                border: layer.highlight ? "1px solid rgba(232,197,71,0.4)" : "1px solid var(--border)",
                background: layer.highlight ? "rgba(232,197,71,0.06)" : "transparent",
              }}
            >
              <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)" }}>
                {layer.label}
              </div>
              <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", marginTop: 4 }}>
                {layer.examples}
              </div>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard id="counterparty-trust" title={INTEGRATE_COUNTERPARTY_TRUST.title}>
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.65rem" }}>
          {INTEGRATE_COUNTERPARTY_TRUST.body}
        </p>
        <BulletList items={[...INTEGRATE_COUNTERPARTY_TRUST.bullets]} />
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0.85rem 0 0" }}>
          <strong style={{ color: "var(--text-primary)" }}>{TRUST_IS_TIME_BOUND_HEADLINE}.</strong>{" "}
          {TRUST_VERIFY_ONCE_HONEST}{" "}
          <Link href="/trust-framework#trust-over-time" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
            Real estate refresh triggers →
          </Link>
        </p>
      </ContentCard>

      <ContentCard title="What you integrate">
        <BulletList items={[...INTEGRATE_CAPABILITIES]} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
          <Btn href="/developers" size="sm">Developer portal →</Btn>
          <Btn href="/docs/partner-verification-requests" variant="secondary" size="sm">Partner API →</Btn>
          <Btn href="/integrations/relying-parties" variant="ghost" size="sm">Relying party program →</Btn>
        </div>
      </ContentCard>

      <ContentCard title="Quick integration (SDK pattern)">
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
            margin: 0,
          }}
        >
          {INTEGRATION_SDK_SNIPPET}
        </pre>
      </ContentCard>

      <ContentCard title="Active relying parties">
        <PartnerExecutionCards />
      </ContentCard>

      <ContentCard title="Built for">
        <BulletList items={[...BUILD_FOR_AUDIENCES]} />
      </ContentCard>

      <ContentCard title="Not a fit if">
        <BulletList items={[...NOT_FOR_AUDIENCES]} />
      </ContentCard>

      <ContentCard title="Robinhood-style embedded finance">
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.75rem" }}>
          If you are embedding stock tokens or RWAs into consumer applications, Abraxas supplies the verification layer —
          Passport, policy decisions, and reusable diligence — so every partner app does not rebuild KYC from scratch.
        </p>
        <Btn href="/design-partner" size="sm">Talk to the team →</Btn>
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginBottom: "2rem" }}>
        <Btn href="/design-partner" size="lg">Apply for integration program →</Btn>
        <Btn href="/developers" variant="secondary" size="lg">Developer docs →</Btn>
        <Link href="/integrations" style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--accent)", alignSelf: "center", textDecoration: "none" }}>
          Full integration hub →
        </Link>
      </div>
    </RedesignPage>
  );
}
