"use client";
// FILE: app/pilot-journey/page.tsx
// Public walkthrough of the working privacy and partner verification surfaces.

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
        eyebrow="Live product journey"
        title="From partner request to private proof"
        subtitle="Follow the working sandbox path from a partner request to a private Passport result and a verifiable receipt."
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

      <ContentCard title="What works today">
        <div style={{ display: "grid", gap: "0.8rem" }}>
          <p style={copyStyle}><strong style={{ color: "var(--text-primary)" }}>Partner request and return.</strong><br />A sandbox partner requests a specific eligibility result and receives the customer at its registered callback.</p>
          <p style={copyStyle}><strong style={{ color: "var(--text-primary)" }}>Private holder consent.</strong><br />Passport shows what will be proved and what remains private before the customer continues.</p>
          <p style={copyStyle}><strong style={{ color: "var(--text-primary)" }}>Signed receipt verification.</strong><br />The returned receipt can be inspected through the public receipt endpoint and verified without exposing source documents.</p>
          <p style={copyStyle}><strong style={{ color: "var(--text-primary)" }}>Reviewed Solana configuration.</strong><br />The public verifier checks finalized devnet proof transactions against the registered gate and protocol configuration.</p>
        </div>
      </ContentCard>

      <ContentCard title="Open the live capabilities">
        <p style={{ ...copyStyle, marginBottom: "1rem" }}>
          Each link opens a working product surface. The receipt verifier accepts an Abraxas receipt ID; the Solana verifier accepts a real finalized devnet transaction signature.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
          <Btn href="/passport">Open Passport</Btn>
          <Btn href="/verify?mode=receipt" variant="secondary">Verify a receipt</Btn>
          <Btn href="/proofs/solana-devnet" variant="secondary">Verify a Solana proof</Btn>
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
