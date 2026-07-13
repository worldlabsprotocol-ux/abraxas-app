"use client";
// FILE: app/operators/page.tsx
// Operators — what changes Monday morning (one question per page).

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, BulletList } from "@/components/redesign/RedesignContent";
import { OperatorRoiCalculator } from "@/components/operators/OperatorRoiCalculator";
import { PermissioningDemo } from "@/components/home/PermissioningDemo";
import { TrustAuditTimeline } from "@/components/home/TrustAuditTimeline";
import { HomeTrustFlywheel } from "@/components/home/HomeTrustFlywheel";
import { CPG_ASSET } from "@/lib/cpgLandCaseStudy";
import {
  OPERATOR_WITHOUT_ABRAXAS,
  OPERATOR_WITH_ABRAXAS,
  NORTH_STAR_METRIC,
  ABRAXAS_VOCAB,
} from "@/lib/reusableTrust";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_OPERATOR_OUTCOME } from "@/lib/northStar";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

const VERTICALS = [
  { name: "Hotels & STR", example: "Cielo Sunrise — live pilot", href: "/case-studies/cielo" },
  { name: "Land & deal rooms", example: CPG_ASSET.name, href: CPG_ASSET.caseStudyPath },
  { name: "Lenders", example: "Trust Requests · yes/no without document folders", href: "/verify" },
  { name: "Marketplaces", example: "Registry · trust before transact", href: "/#registry" },
  { name: "Property managers", example: "Guest proof travels across channels", href: "/passport" },
  { name: "Reservation platforms", example: "USDC settlement on Sui — available today", href: "/cielo/verified-rate" },
];

export default function OperatorsPage() {
  return (
    <RedesignPage maxWidth={920}>
      <PageHeader
        eyebrow="For operators"
        title="What changes Monday morning?"
        subtitle="Abraxas is reusable trust infrastructure — not another KYC upload form. Faster approvals, fewer document requests, less manual review."
      />

      <ContentCard title="North Star">
        <p style={{ ...body, marginTop: 0 }}>
          <strong style={{ color: ACCENT }}>{NORTH_STAR_METRIC.name}</strong> — {NORTH_STAR_METRIC.description}
        </p>
        <p style={{ ...body, margin: 0 }}>{ABRAXAS_OPERATOR_OUTCOME}</p>
      </ContentCard>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
        gap: "1rem",
        marginBottom: "1.25rem",
      }}>
        <ContentCard title="Without Abraxas">
          <BulletList items={[...OPERATOR_WITHOUT_ABRAXAS]} />
        </ContentCard>
        <ContentCard title="With Abraxas">
          <BulletList items={[...OPERATOR_WITH_ABRAXAS]} />
        </ContentCard>
      </div>

      <OperatorRoiCalculator />

      <ContentCard title="Who this is for">
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {VERTICALS.map(v => (
            <a key={v.name} href={v.href} style={{
              display: "flex", justifyContent: "space-between", gap: "0.5rem",
              padding: "0.75rem", borderRadius: 10,
              border: "1px solid var(--border)", background: "var(--surface)",
              textDecoration: "none", color: "inherit",
            }}>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {v.name}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                  {v.example}
                </div>
              </div>
              <span style={{ color: ACCENT, alignSelf: "center" }}>→</span>
            </a>
          ))}
        </div>
      </ContentCard>

      <ContentCard title={`Abraxas vocabulary (plain language)`}>
        <p style={{ ...body, marginTop: 0 }}>
          On primary journeys we say <strong>{ABRAXAS_VOCAB.proof}</strong>, <strong>{ABRAXAS_VOCAB.trustRequest}</strong>, and <strong>{ABRAXAS_VOCAB.trustRules}</strong>.
          Technical terms like {ABRAXAS_VOCAB.docs.assuranceLevel} live in{" "}
          <a href="/docs" style={{ color: ACCENT }}>Documentation</a>.
        </p>
      </ContentCard>

      <div style={{ margin: "1.5rem 0" }}>
        <PermissioningDemo embedded />
      </div>

      <TrustAuditTimeline compact />

      <div style={{ margin: "1.5rem 0" }}>
        <HomeTrustFlywheel embedded />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginBottom: "2rem" }}>
        <Btn href="/design-partner" size="lg">Become a design partner →</Btn>
        <Btn href="/passport" variant="secondary" size="lg">Try Passport</Btn>
        <Btn href="/cielo/verified-rate" variant="ghost" size="lg">Run Cielo workflow</Btn>
      </div>
    </RedesignPage>
  );
}

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  color: "var(--text-secondary)",
  lineHeight: 1.75,
};
