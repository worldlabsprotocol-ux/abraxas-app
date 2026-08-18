"use client";
// FILE: app/design-partner/page.tsx
// Design partner onboarding hub.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { IntegratorStartHerePanel } from "@/components/integrate/IntegratorStartHerePanel";
import {
  INTEGRATOR_SANDBOX_BOUNDARY,
  PARTNER_APPLICATION_PATH,
  PARTNER_POST_APPLY_HEADLINE,
  PARTNER_POST_APPLY_STEPS,
  PARTNER_POST_APPLY_SUBHEAD,
  PARTNER_RECEIPT_DOCS_ANCHOR,
  PARTNER_RECEIPT_VERIFIER_PATH,
} from "@/lib/integrate/partnerJourney";
import {
  PRODUCTION_INTEGRATION_PATH,
  RELYING_PARTY_CHECKLIST,
  RELYING_PARTY_DEFINITION,
} from "@/lib/relyingPartyProgram";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export default function DesignPartnerPage() {
  return (
    <RedesignPage maxWidth={880}>
      <PageHeader
        eyebrow="Design partner program"
        title="Apply to integrate Abraxas Partner Flow"
        subtitle={`${RELYING_PARTY_DEFINITION} Applications are reviewed manually — sandbox and production access are operator-provisioned, not self-serve.`}
      />

      <IntegratorStartHerePanel id="partner-start-here" />

      <ContentCard title={PARTNER_POST_APPLY_HEADLINE}>
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 0.75rem" }}>
          {PARTNER_POST_APPLY_SUBHEAD}
        </p>
        <BulletList items={PARTNER_POST_APPLY_STEPS.map((step, i) => `${i + 1}. ${step}`)} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
          <Btn href={PARTNER_RECEIPT_DOCS_ANCHOR} size="sm">Receipt verification docs</Btn>
          <Btn href="/docs/partner-flow" variant="secondary" size="sm">Partner Flow docs</Btn>
        </div>
      </ContentCard>

      <ContentCard title="Partner Flow guide (start here)">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 0.75rem" }}>
          For age-gated digital commerce with a browser redirect: holders complete verification on Abraxas,
          return to your callback with a receipt_id, and your server verifies{" "}
          <code style={{ fontFamily: MONO, fontSize: "0.68rem" }}>GET /api/receipts/{"{id}"}/public</code> before granting access.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/docs/partner-flow" size="sm">Partner Flow docs</Btn>
          <Btn href={PARTNER_RECEIPT_VERIFIER_PATH} variant="secondary" size="sm">Receipt tester</Btn>
          <Btn href={PARTNER_RECEIPT_DOCS_ANCHOR} variant="ghost" size="sm">Receipt verification docs</Btn>
          <Btn href="/docs/partner-flow-api" variant="ghost" size="sm">OpenAPI</Btn>
        </div>
      </ContentCard>

      <ContentCard title="Onboarding path">
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {RELYING_PARTY_CHECKLIST.map(item => (
            <div key={item.step} style={{
              display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.75rem",
              padding: "0.85rem", borderRadius: 12, border: "1px solid var(--border)",
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", background: "rgba(232,197,71,0.12)",
                border: "1px solid rgba(232,197,71,0.35)", display: "flex", alignItems: "center",
                justifyContent: "center", fontFamily: MONO, fontSize: "0.7rem", fontWeight: 800, color: "var(--accent)",
              }}>
                {item.step}
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                  {item.title}
                </div>
                <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Production checklist (after approval)">
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 0.65rem" }}>
          Production relying-party access requires operator provisioning and passing the same gates Abraxas holds internally.
          No automatic production key issuance.
        </p>
        <BulletList items={PRODUCTION_INTEGRATION_PATH.map((step, i) => `${i + 1}. ${step}`)} />
      </ContentCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "0.65rem", marginBottom: "1.25rem" }}>
        <div className="abx-glass-panel" style={{ padding: "1rem", borderRadius: 14 }}>
          <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800, marginBottom: "0.35rem" }}>1 · Apply</div>
          <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.65rem" }}>
            Submit integration intent. Abraxas reviews manually; sandbox credentials may be issued after approval — not instantly.
          </p>
          <Btn href={PARTNER_APPLICATION_PATH} size="sm">Submit application</Btn>
        </div>
        <div className="abx-glass-panel" style={{ padding: "1rem", borderRadius: 14 }}>
          <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800, marginBottom: "0.35rem" }}>2 · Sandbox test</div>
          <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.65rem" }}>
            <strong style={{ color: "var(--text-primary)" }}>{INTEGRATOR_SANDBOX_BOUNDARY.receiptTesterLabel}:</strong>{" "}
            {INTEGRATOR_SANDBOX_BOUNDARY.receiptTesterDetail}{" "}
            <Link href={PARTNER_RECEIPT_VERIFIER_PATH} style={{ color: "var(--accent)" }}>/verify</Link>
            {" · "}
            <strong style={{ color: "var(--text-primary)" }}>{INTEGRATOR_SANDBOX_BOUNDARY.registryDemoLabel}:</strong>{" "}
            {INTEGRATOR_SANDBOX_BOUNDARY.registryDemoDetail}{" "}
            <Link href="/verify/ABX-RE-HOSP-001" style={{ color: "var(--accent)" }}>ABX-RE-HOSP-001</Link>.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
            <Btn href={PARTNER_RECEIPT_VERIFIER_PATH} variant="secondary" size="sm">Receipt tester</Btn>
            <Btn href={PARTNER_RECEIPT_DOCS_ANCHOR} variant="ghost" size="sm">Server verification</Btn>
          </div>
        </div>
        <div className="abx-glass-panel" style={{ padding: "1rem", borderRadius: 14 }}>
          <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800, marginBottom: "0.35rem" }}>3 · Conformance</div>
          <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.65rem" }}>
            After operators provision partner_id, policy_id, and return_url, run{" "}
            <code style={{ fontFamily: MONO, fontSize: "0.65rem" }}>npm run partner:conformance</code>.
          </p>
          <Btn href="/docs/partner-flow#start-here" variant="secondary" size="sm">Conformance command</Btn>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginBottom: "2rem" }}>
        <Btn href={PARTNER_APPLICATION_PATH} size="lg">Apply for review</Btn>
        <Btn href="/integrate" variant="secondary" size="lg">Integrate overview</Btn>
      </div>
    </RedesignPage>
  );
}
