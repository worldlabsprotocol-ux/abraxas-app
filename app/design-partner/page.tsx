"use client";
// FILE: app/design-partner/page.tsx
// Collaboration page — one flagship design partner, outcome-first outreach.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { DesignPartnerApplyForm } from "@/components/partners/DesignPartnerApplyForm";
import {
  ABRAXAS_OPERATOR_OUTCOME,
  DESIGN_PARTNER_ASK,
  DESIGN_PARTNER_OFFER,
  DESIGN_PARTNER_PROFILE,
  VERTICAL_SEQUENCE,
} from "@/lib/northStar";

const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

export default function DesignPartnerPage() {
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="Design partner program"
        title="Help define reusable verification — starting with hospitality"
        subtitle="We're looking for one flagship operator to co-design the next generation of trust that travels. Not a sales conversation — a collaboration with measured outcomes."
      />

      <ContentCard title="What we're solving">
        <p style={bodyStyle}>
          {ABRAXAS_OPERATOR_OUTCOME}
        </p>
        <p style={{ ...bodyStyle, marginBottom: 0 }}>
          Abraxas is not asking you to adopt decentralized identity. We're asking you to stop rebuilding
          the same verification integration for every new workflow — and to stop storing sensitive documents
          you never wanted in your inbox.
        </p>
      </ContentCard>

      <ContentCard title="Why hospitality first">
        <p style={bodyStyle}>
          High-frequency guests mean fast learning. One property processing thousands of verification events
          teaches us more than a land deal that closes every few months.
        </p>
        <div style={{ display: "grid", gap: "0.55rem" }}>
          {VERTICAL_SEQUENCE.map(v => (
            <div key={v.name} style={{
              padding: "0.75rem 0.85rem", borderRadius: 12,
              border: `1px solid ${v.status === "active" ? `${ACCENT}44` : "var(--border)"}`,
              background: v.status === "active" ? `${ACCENT}08` : "var(--surface)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  {v.order}. {v.name}
                </span>
                <span style={{
                  fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase",
                  color: v.status === "active" ? ACCENT : "var(--text-muted)",
                }}>
                  {v.status === "active" ? "Active pilot" : v.status === "next" ? "Next" : "Later"}
                </span>
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: "0.35rem 0 0", lineHeight: 1.55 }}>
                {v.why}
              </p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "0.85rem" }}>
          <Btn href="/case-studies/cielo" variant="secondary" size="sm">See Cielo reference loop →</Btn>
        </div>
      </ContentCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
        <ContentCard title="Who we're looking for">
          <BulletList items={DESIGN_PARTNER_PROFILE} />
        </ContentCard>
        <ContentCard title="What you receive">
          <BulletList items={DESIGN_PARTNER_OFFER} />
        </ContentCard>
        <ContentCard title="What we need from you">
          <BulletList items={DESIGN_PARTNER_ASK} />
        </ContentCard>
      </div>

      <ContentCard title="Apply — one flagship slot at a time">
        <p style={{ ...bodyStyle, marginBottom: "1rem" }}>
          Integrate once. Every future credential becomes reusable. That's the verification API you never
          have to rebuild.
        </p>
        <DesignPartnerApplyForm defaultIntegrationType="passport_gate" />
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem", alignItems: "center" }}>
        <Btn href="/integrations/relying-parties" variant="secondary" size="sm">Technical onboarding →</Btn>
        <Btn href="/north-star" variant="ghost" size="sm">North Star principles →</Btn>
        <Link href="/docs/partner-verification-requests" style={{ fontFamily: FONT, fontSize: "0.78rem", color: ACCENT, textDecoration: "none" }}>
          Partner API docs →
        </Link>
      </div>
    </RedesignPage>
  );
}

const bodyStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.82rem",
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: "0 0 0.75rem",
};
