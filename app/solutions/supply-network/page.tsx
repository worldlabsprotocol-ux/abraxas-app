"use client";
// FILE: app/solutions/supply-network/page.tsx

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { SUPPLY_NETWORK } from "@/lib/supplyNetworkVision";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export default function SupplyNetworkPage() {
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="Solutions"
        title={SUPPLY_NETWORK.headline}
        subtitle={SUPPLY_NETWORK.subhead}
      />

      <ContentCard title="The commercial operating system for manufacturing">
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.75rem" }}>
          {SUPPLY_NETWORK.valueProp}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>
          The same trust primitives that verify Cielo Sunrise can verify suppliers, contracts, lead times,
          and delivery performance. one shared version of the truth across aerospace, automotive, defense, energy, and medical devices.
        </p>
      </ContentCard>

      <ContentCard title="Verified supplier profile">
        <BulletList items={SUPPLY_NETWORK.supplierFields} />
      </ContentCard>

      <ContentCard title="Verified purchase order lifecycle">
        <ol style={{ margin: 0, padding: "0 0 0 1.1rem", display: "grid", gap: "0.4rem" }}>
          {SUPPLY_NETWORK.orderLifecycle.map((step, i) => (
            <li key={step} style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--text-primary)" }}>{i + 1}.</strong> {step}
            </li>
          ))}
        </ol>
      </ContentCard>

      <ContentCard title="Industries">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {SUPPLY_NETWORK.industries.map(ind => (
            <span key={ind} style={{
              padding: "0.45rem 0.9rem", borderRadius: 999,
              border: "1px solid var(--border)", fontFamily: FONT,
              fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)",
            }}>
              {ind}
            </span>
          ))}
        </div>
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/integrations" size="lg">Become a design partner →</Btn>
        <Btn href="/docs/why-verification" variant="secondary" size="lg">Verification thesis</Btn>
        <Btn href="/build" variant="ghost" size="lg">Submit an asset</Btn>
      </div>
    </RedesignPage>
  );
}
