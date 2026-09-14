"use client";
// FILE: app/integrate/page.tsx
// For businesses: concise commercial positioning.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { AbxCard } from "@/components/design/AbxPrimitives";
import { AbxInnerPage } from "@/components/design/AbxInnerPage";
import { Btn } from "@/components/redesign/ui";
import { ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";
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

const FONT = ABX_FONT_SANS;

export default function IntegratePage() {
  return (
    <RedesignPage maxWidth={820} accent="developer">
      <AbxInnerPage
        accent="developer"
        eyebrow={BUSINESS_PAGE_EYEBROW}
        title={BUSINESS_PAGE_HEADLINE}
        lead={BUSINESS_PAGE_SUBHEAD}
        actions={(
          <>
            <Btn href={PARTNER_APPLICATION_PATH} size="lg">{BUSINESS_PAGE_CTA_PRIMARY}</Btn>
            <Btn href="/docs/partner-flow" variant="secondary" size="lg">{BUSINESS_PAGE_CTA_SECONDARY}</Btn>
          </>
        )}
      >
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "0.85rem",
        }}>
          {BUSINESS_BENEFITS.map((benefit) => (
            <AbxCard key={benefit.id} accent="developer">
              <h2 style={{ margin: "0 0 0.4rem", fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>
                {benefit.title}
              </h2>
              <p style={{ margin: 0, fontFamily: FONT, fontSize: "0.84rem", lineHeight: 1.55, color: "var(--text-secondary)" }}>
                {benefit.body}
              </p>
            </AbxCard>
          ))}
        </div>

        <AbxCard accent="developer" id="integration">
          <h2 style={{ margin: "0 0 0.75rem", fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 700, color: "var(--text-primary)" }}>
            Built for real integration
          </h2>
          <ul style={{ margin: 0, paddingLeft: "1.2rem", fontFamily: FONT, fontSize: "0.88rem", lineHeight: 1.7, color: "var(--text-secondary)" }}>
            {BUSINESS_INTEGRATION_PILLARS.map((item) => (
              <li key={item} style={{ marginBottom: "0.35rem" }}>{item}</li>
            ))}
          </ul>
        </AbxCard>

        <AbxCard accent="partner">
          <p style={{ margin: "0 0 0.35rem", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--abx-accent)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {BUSINESS_PARTNER_PROOF_BADGE}
          </p>
          <h3 style={{ margin: "0 0 0.5rem", fontFamily: FONT, fontSize: "0.98rem", fontWeight: 800, color: "var(--text-primary)" }}>
            {BUSINESS_PARTNER_PROOF_TITLE}
          </h3>
          <p style={{ margin: "0 0 0.85rem", fontFamily: FONT, fontSize: "0.86rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
            Private eligibility verification for an age gated retail experience.
          </p>
          <Link href="/pilot-journey" style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--accent)", textDecoration: "none" }}>
            See the pilot journey →
          </Link>
        </AbxCard>

        <AbxCard accent="developer">
          <h2 style={{ margin: "0 0 0.75rem", fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 700, color: "var(--text-primary)" }}>
            Documentation
          </h2>
          <p style={{ fontFamily: FONT, fontSize: "0.86rem", lineHeight: 1.65, color: "var(--text-secondary)", margin: "0 0 0.85rem" }}>
            {BUSINESS_DEV_TOOLS_NOTE}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
            <Btn href="/docs/partner-flow" size="sm">Partner Flow docs</Btn>
            <Btn href="/docs" variant="secondary" size="sm">All documentation</Btn>
          </div>
        </AbxCard>
      </AbxInnerPage>
    </RedesignPage>
  );
}
