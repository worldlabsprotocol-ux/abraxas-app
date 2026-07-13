"use client";
// FILE: app/design-partner/page.tsx
// Design partners in execution — program remains open for selective future slots.

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
  verticalStatusLabel,
} from "@/lib/northStar";
import { PartnerExecutionCards } from "@/components/partners/PartnerExecutionCards";
import { REAL_PARTNERS } from "@/lib/partnerStatus";

const FONT = "'Inter',system-ui,sans-serif";
const ACCENT = "#10B981";

export default function DesignPartnerPage() {
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow="Design partners"
        title="Real partners in production — program still open"
        subtitle="Active design partners co-build reusable verification with measured outcomes — not another document portal."
      />

      <ContentCard title="Land & tribal owners — start here">
        <p style={bodyStyle}>
          If you are onboarding as a land developer or tribal / mineral steward, use the owner portal:
          submit once, track every stage, and control what approved parties see. This is the same verify-once
          pattern as Cielo — applied to high-stakes land workflows.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/portal/apply" size="sm">Start intake →</Btn>
          <Btn href="/portal/status" variant="secondary" size="sm">Track application →</Btn>
          <Btn href="/portal" variant="ghost" size="sm">How the portal works →</Btn>
        </div>
      </ContentCard>

      {REAL_PARTNERS.length > 0 && (
        <ContentCard title="Active design partners">
          <p style={bodyStyle}>
            Partners below are onboarded on Abraxas — vertical headlines show until a partner approves public naming.
          </p>
          <PartnerExecutionCards />
        </ContentCard>
      )}

      <ContentCard title="What we're solving">
        <p style={bodyStyle}>
          {ABRAXAS_OPERATOR_OUTCOME}
        </p>
        <p style={{ ...bodyStyle, marginBottom: 0 }}>
          Abraxas is not asking you to adopt decentralized identity. We eliminate repeated verification
          so your guests, borrowers, or buyers move faster — and sensitive documents never sit in your inbox.
        </p>
      </ContentCard>

      <ContentCard title="Vertical execution">
        <p style={bodyStyle}>
          Cielo Sunrise is genesis dogfood in hospitality. Tribal land and mineral partners are in execution now —
          same verify-once infrastructure, different evidence scope.
        </p>
        <div style={{ display: "grid", gap: "0.55rem" }}>
          {VERTICAL_SEQUENCE.map(v => (
            <div key={v.name} style={{
              padding: "0.75rem 0.85rem", borderRadius: 12,
              border: `1px solid ${v.status === "active" || v.status === "in_execution" ? `${ACCENT}44` : "var(--border)"}`,
              background: v.status === "active" || v.status === "in_execution" ? `${ACCENT}08` : "var(--surface)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  {v.order}. {v.name}
                </span>
                <span style={{
                  fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase",
                  color: v.status === "roadmap" ? "var(--text-muted)" : ACCENT,
                }}>
                  {verticalStatusLabel(v.status)}
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

      <ContentCard title="Apply for a future selective slot">
        <p style={{ ...bodyStyle, marginBottom: "1rem" }}>
          Integrate once. Every future credential becomes reusable. New partners join selectively —
          after current onboarding completes.
        </p>
        <DesignPartnerApplyForm defaultIntegrationType="passport_gate" />
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem", alignItems: "center" }}>
        <Btn href="/integrations/relying-parties" variant="secondary" size="sm">Technical onboarding →</Btn>
        <Btn href="/north-star" variant="ghost" size="sm">Our focus →</Btn>
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
