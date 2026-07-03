"use client";
// FILE: app/case-studies/cielo/page.tsx
// VC-grade case study for the genesis asset.

import Link from "next/link";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard, KeyValueTable, BulletList } from "@/components/redesign/RedesignContent";
import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";
const D = FLAGSHIP_PROPERTY;
const yieldPct = `${(D.financials.cashYield * 100).toFixed(1)}%`;

const V5_STAGES = [
  "SUBMITTED",
  "IDENTITY_REVIEW",
  "OWNERSHIP_REVIEW",
  "LEGAL_REVIEW",
  "DUE_DILIGENCE",
  "RISK_SCORING",
  "APPROVAL_COMMITTEE",
  "TOKENIZATION_AUTH",
  "MINTED",
  "MARKETPLACE_LIVE",
];

export default function CieloCaseStudyPage() {
  return (
    <RedesignPage maxWidth={860}>
      <PageHeader
        eyebrow="Case study · Genesis asset"
        title="Cielo Sunrise (AAS-1)"
        subtitle="How Abraxas proves the full loop: verified real property → live booking → stablecoin payment on Sui. This is eat-your-own-dogfood, not a mockup."
      />

      <ContentCard title="Asset snapshot">
        <KeyValueTable rows={[
          { k: "Designation", v: D.designation },
          { k: "Appraised value", v: `$${(D.financials.estimatedValue / 1_000_000).toFixed(1)}M` },
          { k: "Cash yield", v: yieldPct },
          { k: "Location", v: D.location.address },
          { k: "Live listing", v: "Airbnb + Abraxas Protocol Calendar", mono: false },
          { k: "Payment rail", v: "USDC on Sui (live booking flow)" },
        ]} />
      </ContentCard>

      <ContentCard title="Why this asset matters">
        <p style={body}>
          Cielo is not a render — it is a operating short-term rental with verifiable occupancy, public Airbnb listing,
          and mirrored availability on Abraxas. Investors can cross-check dates, photos, and revenue assumptions independently.
        </p>
        <BulletList items={[
          "First asset to complete Abraxas verification narrative end-to-end",
          "Live revenue loop: request → operator confirm → pay → receipt",
          "Template for future hospitality and real-estate RWAs",
          "Public dossier at /flagship with financial tabs and calendar",
        ]} />
      </ContentCard>

      <ContentCard title="Booking & payment flow">
        <ol style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.85, margin: 0, paddingLeft: "1.25rem" }}>
          <li>Guest selects dates on homepage featured asset or /flagship calendar</li>
          <li>Booking request stored in Supabase · Protocol Calendar blocks dates</li>
          <li>Operator confirms within 24h · payment link issued</li>
          <li>Guest signs in with Google (zkLogin) · one-click USDC pay on Sui</li>
          <li>Transaction verified · receipt at /cielo/receipt · status at /cielo/status</li>
        </ol>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>
          <Btn href="/terminal#featured-asset" size="sm">Book on homepage</Btn>
          <Btn href="/flagship" variant="secondary" size="sm">Full dossier</Btn>
          <Btn href={D.airbnbUrl} newTab variant="ghost" size="sm">Airbnb listing</Btn>
        </div>
      </ContentCard>

      <ContentCard title="V5 pipeline (asset lifecycle)">
        <p style={{ ...body, marginBottom: "0.75rem" }}>
          Cielo moved through the Abraxas verification pipeline. Future assets follow the same stages:
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
          {V5_STAGES.map((s, i) => (
            <span key={s} style={{
              fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
              padding: "0.25rem 0.5rem", borderRadius: 6,
              background: i >= 8 ? `${ACCENT}18` : "var(--surface)",
              border: `1px solid ${i >= 8 ? `${ACCENT}44` : "var(--border)"}`,
              color: i >= 8 ? ACCENT : "var(--text-muted)",
            }}>
              {i + 1}. {s}
            </span>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="Evidence checklist (no claim without proof)">
        <BulletList items={[
          "Airbnb listing URL — public, bookable independently",
          "Appraisal and NOI documented in /flagship financials tab",
          "Booking records in Supabase stay_requests (see /metrics)",
          "On-chain payment digest verifiable on Sui explorer when captured",
          "Instagram and property photos in public gallery",
        ]} />
      </ContentCard>

      <ContentCard title="Post-issuance monitoring (roadmap)">
        <p style={body}>
          Institutional diligence does not stop at mint. Abraxas is building ongoing monitoring: valuation refresh,
          income reporting, insurance status, material events, and credential expiry — so proof stays current.
        </p>
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2rem" }}>
        <Btn href="/investors" size="lg">Data room →</Btn>
        <Btn href="/metrics" variant="secondary" size="lg">Live metrics</Btn>
        <Link href="/docs/litepaper" style={{ fontFamily: FONT, fontSize: "0.82rem", color: ACCENT, alignSelf: "center", textDecoration: "none" }}>
          Litepaper →
        </Link>
      </div>
    </RedesignPage>
  );
}

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.86rem",
  color: "var(--text-secondary)",
  lineHeight: 1.75,
  margin: 0,
};
