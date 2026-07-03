"use client";
// FILE: app/integrations/relying-parties/page.tsx
// How external protocols become Abraxas relying parties.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import {
  RELYING_PARTY_DEFINITION,
  RELYING_PARTY_CHECKLIST,
  CREDENTIAL_VERIFY_EXAMPLE,
  TRUST_STATUS_EXAMPLE,
  REGISTRY_VERIFY_EXAMPLE,
  RELYING_PARTY_LIMITATIONS,
  DESIGN_PARTNER_SLOTS,
} from "@/lib/relyingPartyProgram";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export default function RelyingPartiesPage() {
  return (
    <RedesignPage maxWidth={900}>
      <PageHeader
        eyebrow="Relying party program"
        title="Verify once. Your protocol clears the transaction."
        subtitle={RELYING_PARTY_DEFINITION}
      />

      <ContentCard title="Why this is the network-effect milestone">
        <p style={body}>
          Abraxas becomes infrastructure when an <strong>unaffiliated</strong> lender, marketplace, or protocol
          checks our credential state in production — not when we claim acceptance on a landing page.
          First-party flows (Cielo booking, /passport) prove the rails work. Your integration proves they travel.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
          <Btn href="/verify" size="sm">Test public verifier →</Btn>
          <Btn href="/integrations" variant="secondary" size="sm">Apply as design partner</Btn>
        </div>
      </ContentCard>

      <ContentCard title="Four-step onboarding">
        <div style={{ display: "grid", gap: "0.85rem" }}>
          {RELYING_PARTY_CHECKLIST.map(item => (
            <div key={item.step} style={{
              display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.85rem",
              padding: "0.85rem", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", background: `${ACCENT}18`,
                border: `1px solid ${ACCENT}44`, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: MONO, fontSize: "0.72rem", fontWeight: 800, color: ACCENT,
              }}>
                {item.step}
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                  {item.title}
                </div>
                <p style={{ ...body, margin: 0 }}>{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="API reference — credential verify">
        <p style={{ ...body, marginBottom: "0.65rem" }}>
          Full identity gate for regulated flows. User presents JWT; your server verifies via Abraxas.
        </p>
        <CodeBlock>{CREDENTIAL_VERIFY_EXAMPLE}</CodeBlock>
      </ContentCard>

      <ContentCard title="API reference — trust status">
        <p style={{ ...body, marginBottom: "0.65rem" }}>
          Lightweight wallet check for browse-to-transact flows.
        </p>
        <CodeBlock>{TRUST_STATUS_EXAMPLE}</CodeBlock>
      </ContentCard>

      <ContentCard title="API reference — public registry">
        <p style={{ ...body, marginBottom: "0.65rem" }}>
          Asset and Passport DID lookup with assurance taxonomy (L1–L4).
        </p>
        <CodeBlock>{REGISTRY_VERIFY_EXAMPLE}</CodeBlock>
        <p style={{ ...body, marginTop: "0.65rem", marginBottom: 0 }}>
          Try: <Link href="/verify?q=ABX-RE-HOSP-001" style={{ color: ACCENT }}>ABX-RE-HOSP-001</Link>
        </p>
      </ContentCard>

      <ContentCard title="Open design partner slots">
        {DESIGN_PARTNER_SLOTS.map(slot => (
          <div key={slot.category} style={{ padding: "0.65rem 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {slot.category}
            </div>
            <p style={{ ...body, margin: "0.25rem 0" }}>{slot.need}</p>
            <code style={{ fontFamily: MONO, fontSize: "0.62rem", color: ACCENT }}>{slot.api}</code>
          </div>
        ))}
      </ContentCard>

      <ContentCard title="Relying party limitations">
        <BulletList items={[...RELYING_PARTY_LIMITATIONS]} />
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/integrations" size="lg">Apply as design partner →</Btn>
        <Btn href="/investors/strategy" variant="secondary" size="lg">Strategic roadmap</Btn>
        <Link href="/docs/ail" style={{ fontFamily: FONT, fontSize: "0.82rem", color: ACCENT, alignSelf: "center", textDecoration: "none" }}>
          AIL spec →
        </Link>
      </div>
    </RedesignPage>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre style={{
      fontFamily: MONO, fontSize: "0.65rem", lineHeight: 1.55,
      padding: "1rem", borderRadius: 10, overflow: "auto",
      background: "var(--surface)", border: "1px solid var(--border)",
      color: "var(--text-secondary)", margin: 0,
    }}>
      {children}
    </pre>
  );
}

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.75,
  margin: 0,
};
