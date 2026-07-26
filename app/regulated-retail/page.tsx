"use client";
// FILE: app/regulated-retail/page.tsx
// Cannabis + spirits: age gates, portable eligibility, partner pilots.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { AgeGateCompareDemo } from "@/components/regulatedRetail/AgeGateCompareDemo";
import { GOOD_TROUBLE_BRAND, GOOD_TROUBLE_INTEGRATION_PATH } from "@/lib/goodTrouble/constants";
import {
  REGULATED_RETAIL_CRYPTO_PARALLEL,
  REGULATED_RETAIL_HEADLINE,
  REGULATED_RETAIL_SAFER_THAN_POPUP,
  REGULATED_RETAIL_SUBLINE,
} from "@/lib/regulatedRetail/vertical";
import {
  GOOD_TROUBLE_RETAIL_POLICY,
  SPIRITS_RETAIL_POLICY_TEMPLATE,
  retailVerifyExample,
} from "@/lib/regulatedRetail/eligibilityPolicies";
import { COMPLIANCE_GATE_HONESTY } from "@/lib/complianceGatePositioning";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

export default function RegulatedRetailPage() {
  return (
    <RedesignPage maxWidth={920}>
      <PageHeader
        eyebrow="Cannabis · Spirits · Age-gated retail"
        title={REGULATED_RETAIL_HEADLINE}
        subtitle={REGULATED_RETAIL_SUBLINE}
      />

      <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1.5rem", maxWidth: 720 }}>
        {REGULATED_RETAIL_CRYPTO_PARALLEL}
      </p>

      <AgeGateCompareDemo />

      <section style={{ marginTop: "2rem", marginBottom: "2rem" }}>
        <h2 style={{ fontFamily: FONT, fontSize: "var(--fs-h3)", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.75rem" }}>
          Why Abraxas is safer than a checkbox
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.65rem" }}>
          {REGULATED_RETAIL_SAFER_THAN_POPUP.map(item => (
            <div key={item.title} style={{ padding: "0.85rem 1rem", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-raised)" }}>
              <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{item.title}</div>
              <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.55 }}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontFamily: FONT, fontSize: "var(--fs-h3)", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.75rem" }}>
          Integration patterns
        </h2>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <CodeBlock title={`Cannabis · ${GOOD_TROUBLE_RETAIL_POLICY.policy_id}`} code={retailVerifyExample(GOOD_TROUBLE_RETAIL_POLICY)} />
          <CodeBlock title={`Spirits template · ${SPIRITS_RETAIL_POLICY_TEMPLATE.policy_id}`} code={retailVerifyExample(SPIRITS_RETAIL_POLICY_TEMPLATE)} />
        </div>
      </section>

      <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 1.5rem", maxWidth: 680 }}>
        {COMPLIANCE_GATE_HONESTY}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "2.5rem" }}>
        <Btn href="/passport" size="sm">Verify on Passport →</Btn>
        <Btn href="/verify?mode=credential" variant="secondary" size="sm">Test credential verify →</Btn>
        <Btn href="/integrations/relying-parties" variant="ghost" size="sm">Relying party program →</Btn>
      </div>

      <section style={{ marginTop: "1rem", padding: "1rem 1.15rem", borderRadius: 14, border: "1px solid var(--border-strong)", background: "var(--surface-raised)" }}>
        <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
          Active partner pilot
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.35rem" }}>
          {GOOD_TROUBLE_BRAND.name} · {GOOD_TROUBLE_BRAND.legalName}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0 0 0.75rem", lineHeight: 1.55 }}>
          {GOOD_TROUBLE_BRAND.location} · Est. {GOOD_TROUBLE_BRAND.established}. Batch provenance fixtures + retail eligibility policy on Abraxas sandbox.
        </p>
        <Btn href={GOOD_TROUBLE_INTEGRATION_PATH} variant="secondary" size="sm">
          Good Trouble pilot details →
        </Btn>
      </section>
    </RedesignPage>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div>
      <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>{title}</div>
      <pre style={{
        fontFamily: MONO, fontSize: "0.6rem", lineHeight: 1.55, margin: 0,
        padding: "0.85rem", borderRadius: 10, overflow: "auto",
        background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)",
      }}>
        {code}
      </pre>
    </div>
  );
}
