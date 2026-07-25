"use client";
// FILE: app/design-partner/page.tsx
// Design partner onboarding hub.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
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
        title="Apply to integrate Abraxas verification"
        subtitle={RELYING_PARTY_DEFINITION}
      />

      <ContentCard title="Integration guide (start here)">
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 0.75rem" }}>
          One API call returns a decision plus cryptographic proof that any relying party can verify independently.
          Copy-paste examples, curl commands, and JSON schemas cover what you need before you apply.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/docs/relying-party-verify" size="sm">Read integration guide</Btn>
          <Btn href="/api/docs/relying-party" variant="secondary" size="sm">JSON API</Btn>
          <Btn href="/api/proof/reference/ABX-RE-HOSP-001" variant="ghost" size="sm">Live Cielo demo</Btn>
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

      <ContentCard title="Production checklist">
        <BulletList items={PRODUCTION_INTEGRATION_PATH.map((step, i) => `${i + 1}. ${step}`)} />
      </ContentCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "0.65rem", marginBottom: "1.25rem" }}>
        <div className="abx-glass-panel" style={{ padding: "1rem", borderRadius: 14 }}>
          <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800, marginBottom: "0.35rem" }}>1 · Apply</div>
          <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.65rem" }}>
            Submit integration intent. We review within 48h and issue an <code style={{ fontFamily: MONO, fontSize: "0.65rem" }}>abx_test_</code> sandbox key on approval.
          </p>
          <Btn href="/integrations#apply" size="sm">Submit application</Btn>
        </div>
        <div className="abx-glass-panel" style={{ padding: "1rem", borderRadius: 14 }}>
          <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800, marginBottom: "0.35rem" }}>2 · Sandbox test</div>
          <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.65rem" }}>
            Verify against <Link href="/verify/ABX-RE-HOSP-001" style={{ color: "var(--accent)" }}>ABX-RE-HOSP-001</Link> or Passport Tier 3 demo before production wiring.
          </p>
          <Btn href="/verify" variant="secondary" size="sm">Public verifier</Btn>
        </div>
        <div className="abx-glass-panel" style={{ padding: "1rem", borderRadius: 14 }}>
          <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 800, marginBottom: "0.35rem" }}>3 · Partner portal</div>
          <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 0.65rem" }}>
            Paste your issued API key to view usage, onboarding progress, and integration status.
          </p>
          <Btn href="/developers/partner" variant="secondary" size="sm">Open portal</Btn>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginBottom: "2rem" }}>
        <Btn href="/integrations/relying-parties" size="lg">Program docs</Btn>
        <Btn href="/integrate" variant="secondary" size="lg">Integrate overview</Btn>
      </div>
    </RedesignPage>
  );
}
