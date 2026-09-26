"use client";
// FILE: app/pilot-journey/page.tsx
// Public Week 2 walkthrough that points to the working sandbox surfaces.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

const stepStyle = {
  display: "grid",
  gridTemplateColumns: "2rem minmax(0, 1fr)",
  gap: "0.75rem",
  alignItems: "start",
} as const;

const numberStyle = {
  width: "2rem",
  height: "2rem",
  borderRadius: "999px",
  display: "grid",
  placeItems: "center",
  background: "var(--accent-soft)",
  color: "var(--accent)",
  fontFamily: FONT,
  fontWeight: 800,
  fontSize: "0.82rem",
} as const;

const copyStyle = {
  margin: 0,
  fontFamily: FONT,
  fontSize: "0.9rem",
  lineHeight: 1.6,
  color: "var(--text-secondary)",
} as const;

export default function PilotJourneyPage() {
  return (
    <RedesignPage accent="neutral" maxWidth={760}>
      <PageHeader
        eyebrow="Week 2 · Live pilot journey"
        title="From partner request to private proof"
        subtitle="Follow the working sandbox flow from a partner checkout to an Abraxas Passport result. This is a live product path, not a design mockup."
      />

      <ContentCard title="Try the working flow">
        <div style={{ display: "grid", gap: "1rem" }}>
          <div style={stepStyle}>
            <span style={numberStyle}>1</span>
            <p style={copyStyle}><strong style={{ color: "var(--text-primary)" }}>Start with the partner.</strong><br />Good Trouble asks for one result: confirm the customer is 21 or older.</p>
          </div>
          <div style={stepStyle}>
            <span style={numberStyle}>2</span>
            <p style={copyStyle}><strong style={{ color: "var(--text-primary)" }}>Use Abraxas Passport.</strong><br />The customer reviews exactly what the partner needs and keeps their birth date and documents private.</p>
          </div>
          <div style={stepStyle}>
            <span style={numberStyle}>3</span>
            <p style={copyStyle}><strong style={{ color: "var(--text-primary)" }}>Return with a signed result.</strong><br />The partner receives a reusable eligibility result and can verify the receipt.</p>
          </div>
          <Btn href="/good-trouble" size="lg">Start the live sandbox →</Btn>
        </div>
      </ContentCard>

      <ContentCard title="What changed since Week 1">
        <div style={{ display: "grid", gap: "0.8rem" }}>
          <p style={copyStyle}><strong style={{ color: "var(--text-primary)" }}>Week 1:</strong> the private verification foundation and partner setup.</p>
          <p style={copyStyle}><strong style={{ color: "var(--text-primary)" }}>Week 2:</strong> a holder-facing Passport, partner handoff and return, signed receipt experience, verified Solana devnet configuration, and a public transaction verifier.</p>
        </div>
      </ContentCard>

      <ContentCard title="Inspect the build">
        <p style={{ ...copyStyle, marginBottom: "1rem" }}>
          Open each live surface directly. The Solana verifier accepts a real finalized devnet transaction signature.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
          <Btn href="/passport">Open Passport</Btn>
          <Btn href="/proofs/solana-devnet" variant="secondary">Open Solana verifier</Btn>
          <Btn href="/developers/launchpad" variant="secondary">Open Partner Launchpad</Btn>
        </div>
      </ContentCard>

      <ContentCard title="Sandbox scope">
        <p style={copyStyle}>
          This journey uses the real application path and sandbox services. It does not grant production approval, complete a purchase, or move funds.
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
