"use client";
// FILE: app/integrate/page.tsx
// For businesses — concise commercial positioning.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  BUSINESS_BENEFITS,
  BUSINESS_DEV_TOOLS_NOTE,
  BUSINESS_INTEGRATION_PILLARS,
  BUSINESS_PAGE_CTA_PRIMARY,
  BUSINESS_PAGE_CTA_SECONDARY,
  BUSINESS_PAGE_EYEBROW,
  BUSINESS_PAGE_HEADLINE,
  BUSINESS_PAGE_SUBHEAD,
  BUSINESS_PARTNER_PROOF_BADGE,
  BUSINESS_PARTNER_PROOF_TITLE,
} from "@/lib/integrate/businessPageCopy";
import { PARTNER_APPLICATION_PATH } from "@/lib/integrate/partnerJourney";

const FONT = ABRAXAS_FONT_SANS;
const GOLD = "#E8C547";

export default function IntegratePage() {
  return (
    <RedesignPage maxWidth={820}>
      <PageHeader
        eyebrow={BUSINESS_PAGE_EYEBROW}
        title={BUSINESS_PAGE_HEADLINE}
        subtitle={BUSINESS_PAGE_SUBHEAD}
      />

      <div className="abx-home-hero-actions" style={{ justifyContent: "flex-start", marginBottom: "2rem" }}>
        <Btn href={PARTNER_APPLICATION_PATH} size="lg">{BUSINESS_PAGE_CTA_PRIMARY}</Btn>
        <Btn href="/docs/partner-flow" variant="secondary" size="lg">{BUSINESS_PAGE_CTA_SECONDARY}</Btn>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "0.85rem",
        marginBottom: "2rem",
      }}>
        {BUSINESS_BENEFITS.map((benefit) => (
          <article
            key={benefit.id}
            style={{
              padding: "1.1rem 1.15rem",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(12,14,24,0.55)",
              textAlign: "left",
            }}
          >
            <h2 style={{ margin: "0 0 0.4rem", fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {benefit.title}
            </h2>
            <p style={{ margin: 0, fontFamily: FONT, fontSize: "0.84rem", lineHeight: 1.55, color: "var(--text-secondary)" }}>
              {benefit.body}
            </p>
          </article>
        ))}
      </div>

      <ContentCard title="Built for real integration">
        <ul style={{ margin: 0, paddingLeft: "1.2rem", fontFamily: FONT, fontSize: "0.88rem", lineHeight: 1.7, color: "var(--text-secondary)" }}>
          {BUSINESS_INTEGRATION_PILLARS.map((item) => (
            <li key={item} style={{ marginBottom: "0.35rem" }}>{item}</li>
          ))}
        </ul>
      </ContentCard>

      <ContentCard title="Partner proof">
        <p style={{ margin: "0 0 0.35rem", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: GOLD, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {BUSINESS_PARTNER_PROOF_BADGE}
        </p>
        <h3 style={{ margin: "0 0 0.5rem", fontFamily: FONT, fontSize: "0.98rem", fontWeight: 800 }}>
          {BUSINESS_PARTNER_PROOF_TITLE}
        </h3>
        <p style={{ margin: "0 0 0.85rem", fontFamily: FONT, fontSize: "0.86rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
          Private eligibility verification for an age-gated retail experience.
        </p>
        <Link href="/pilot-journey" style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
          See the pilot journey →
        </Link>
      </ContentCard>

      <ContentCard title="Documentation">
        <p style={{ fontFamily: FONT, fontSize: "0.86rem", lineHeight: 1.65, color: "var(--text-secondary)", margin: "0 0 0.85rem" }}>
          {BUSINESS_DEV_TOOLS_NOTE}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
          <Btn href="/docs/partner-flow" size="sm">Partner Flow docs</Btn>
          <Btn href="/docs" variant="secondary" size="sm">All documentation</Btn>
        </div>
      </ContentCard>
    </RedesignPage>
  );
}
