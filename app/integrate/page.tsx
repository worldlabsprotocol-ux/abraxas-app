"use client";
// FILE: app/integrate/page.tsx
// Integrate Abraxas — proof first, honest status, then technical depth.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { PartnerExecutionCards } from "@/components/partners/PartnerExecutionCards";
import { CurrentStatusModule } from "@/components/status/CurrentStatusModule";
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
import { BUILDER_PROOF_EXAMPLES } from "@/lib/positioningStrategy";
import { INTEGRATE_PRODUCTION_NOTE } from "@/lib/currentStatus";
import { PRODUCTION_INTEGRATION_PATH } from "@/lib/relyingPartyProgram";
import { AGENT_POSITIONING_LONG, AGENT_POSITIONING_SHORT } from "@/lib/agentVerification";
import {
  AGENTIC_FINANCE_COMPOSE_FLOW,
  AGENTIC_FINANCE_HEADLINE,
  AGENTIC_FINANCE_INDEPENDENCE_NOTE,
  getAgenticFinanceStack,
} from "@/lib/agenticFinancePositioning";
import { RelyingPartyProofStatus } from "@/components/integrations/RelyingPartyProofStatus";
import { EliteConceptDemo } from "@/components/home/ConceptDemoVideo";
import { BUILD_ELITE_DEMO, STACK_ELITE_DEMO, REFERENCE_ELITE_DEMO } from "@/lib/eliteDemoSlides";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export default function IntegratePage() {
  return (
    <RedesignPage maxWidth={880}>
      <PageHeader
        eyebrow="Integrate Abraxas"
        title="Embed verification — don't rebuild KYC"
        subtitle={INTEGRATE_PRODUCTION_NOTE}
      />

      <EliteConceptDemo config={BUILD_ELITE_DEMO} id="integrate-demo" />

      <ContentCard title={AGENTIC_FINANCE_HEADLINE}>
        <p style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.6, margin: "0 0 0.5rem" }}>
          {AGENT_POSITIONING_SHORT}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.65rem" }}>
          {AGENT_POSITIONING_LONG}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.65, margin: "0 0 0.75rem" }}>
          {AGENTIC_FINANCE_INDEPENDENCE_NOTE}
        </p>
        <BulletList items={[...AGENTIC_FINANCE_COMPOSE_FLOW]} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
          <Btn href="/docs/ai-agents" size="sm">For AI agents →</Btn>
          <Btn href="/api/docs/agents" variant="secondary" size="sm">JSON agent guide →</Btn>
        </div>
        <p style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", margin: "0.65rem 0 0" }}>
          agentic_finance_stack in GET /api/docs/agents · {getAgenticFinanceStack().schema}
        </p>
      </ContentCard>

      <ContentCard title="Live proof">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "0.55rem" }}>
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
      </ContentCard>

      <div style={{ marginBottom: "1.25rem" }}>
        <CurrentStatusModule id="integrate-status" variant="full" />
      </div>

      <div id="counterparty-trust">
      <EliteConceptDemo config={REFERENCE_ELITE_DEMO} compact />
      <ContentCard title={INTEGRATE_COUNTERPARTY_TRUST.title}>
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.65rem" }}>
          {INTEGRATE_COUNTERPARTY_TRUST.body}
        </p>
        <BulletList items={[...INTEGRATE_COUNTERPARTY_TRUST.bullets]} />
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0.85rem 0 0" }}>
          <strong style={{ color: "var(--text-primary)" }}>{TRUST_IS_TIME_BOUND_HEADLINE}.</strong>{" "}
          {TRUST_VERIFY_ONCE_HONEST}{" "}
          <Link href="/trust-framework#trust-over-time" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
            Full explanation →
          </Link>
        </p>
      </ContentCard>
      </div>

      <ContentCard title="The category">
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.65rem" }}>
          {ABRAXAS_INFRA_NARRATIVE}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: 0 }}>
          {ABRAXAS_INFRA_POSITIONING}
        </p>
      </ContentCard>

      <ContentCard title="Where Abraxas sits">
        <EliteConceptDemo config={STACK_ELITE_DEMO} compact />
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

      <ContentCard title="What you integrate">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.65, margin: "0 0 0.65rem" }}>
          {ABRAXAS_EMBED_PITCH}
        </p>
        <BulletList items={[...INTEGRATE_CAPABILITIES]} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
          <Btn href="/developers" size="sm">For builders →</Btn>
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

      <ContentCard title="Become an external relying party">
        <RelyingPartyProofStatus />
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.65rem" }}>
          Your first approved production verify call with an <code style={{ fontFamily: MONO, fontSize: "0.72rem" }}>abx_live_</code> key
          logs toward our mainnet gate — not sandbox flows or first-party Cielo/Passport paths.
        </p>
        <BulletList items={PRODUCTION_INTEGRATION_PATH.map((step, i) => `${i + 1}. ${step}`)} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
          <Btn href="/docs/relying-party-verify" size="sm">Integration guide →</Btn>
          <Btn href="/integrations/relying-parties" variant="secondary" size="sm">Full program + webhooks →</Btn>
          <Btn href="/design-partner" variant="ghost" size="sm">Request abx_live_ key →</Btn>
        </div>
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginBottom: "2rem" }}>
        <Btn href="/design-partner" size="lg">Apply for integration program →</Btn>
        <Btn href="/trust-framework#trust-over-time" variant="secondary" size="lg">How trust stays current →</Btn>
        <Link href="/roadmap#mainnet-readiness" style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--accent)", alignSelf: "center", textDecoration: "none" }}>
          Mainnet checklist →
        </Link>
      </div>
    </RedesignPage>
  );
}
