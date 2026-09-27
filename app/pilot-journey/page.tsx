"use client";
// FILE: app/pilot-journey/page.tsx
// Public, judge-friendly walkthrough of the working privacy and partner verification surfaces.

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

const actionStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.55rem",
  marginTop: "0.65rem",
} as const;

const builderHref =
  "/developers/integration-studio?pack=age_21_retail&path=hosted_partner_flow&platform=nextjs&source=live-demo";

export default function PilotJourneyPage() {
  return (
    <RedesignPage accent="neutral" maxWidth={760}>
      <PageHeader
        eyebrow="60-second live demo"
        title="Build it. Run it. Verify it."
        subtitle="See both sides of Abraxas: a partner configures one private result, then a customer proves it without sharing their underlying evidence."
      />

      <ContentCard title="Run the demo">
        <div style={{ display: "grid", gap: "1.1rem" }}>
          <div style={stepStyle}>
            <span style={numberStyle}>1</span>
            <div>
              <p style={copyStyle}>
                <strong style={{ color: "var(--text-primary)" }}>Build the integration.</strong><br />
                Open a ready-to-edit 21+ policy and see the hosted path a partner can connect without a terminal.
              </p>
              <div style={actionStyle}>
                <Btn href={builderHref} variant="secondary">Open the builder</Btn>
              </div>
            </div>
          </div>

          <div style={stepStyle}>
            <span style={numberStyle}>2</span>
            <div>
              <p style={copyStyle}>
                <strong style={{ color: "var(--text-primary)" }}>Run the customer flow.</strong><br />
                Good Trouble requests only a current 21+ result. Passport shows what is shared and what stays private.
              </p>
              <div style={actionStyle}>
                <Btn href="/good-trouble/checkout" size="lg">Run the live flow →</Btn>
              </div>
            </div>
          </div>

          <div style={stepStyle}>
            <span style={numberStyle}>3</span>
            <div>
              <p style={copyStyle}>
                <strong style={{ color: "var(--text-primary)" }}>Verify the result.</strong><br />
                The partner server checks the signed receipt before access is granted. The same receipt can be inspected publicly.
              </p>
              <div style={actionStyle}>
                <Btn href="/verify?mode=receipt" variant="secondary">Open receipt verifier</Btn>
              </div>
            </div>
          </div>
        </div>
      </ContentCard>

      <ContentCard title="What the demo proves">
        <p style={copyStyle}>
          A real partner request enters Passport, the holder consents to one policy result, and the partner rechecks the signed receipt on its server before unlocking the destination.
        </p>
        <details style={{ marginTop: "0.85rem", fontFamily: FONT }}>
          <summary style={{ cursor: "pointer", color: "var(--text-primary)", fontWeight: 750 }}>
            Technical proof and additional live surfaces
          </summary>
          <div style={{ display: "grid", gap: "0.8rem", marginTop: "0.8rem" }}>
            <p style={copyStyle}>
              The receipt verifier checks the signed artifact. The Solana verifier accepts a real finalized devnet transaction signature and checks it against the registered gate and protocol configuration.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
              <Btn href="/passport" variant="secondary">Passport</Btn>
              <Btn href="/proofs/solana-devnet" variant="secondary">Solana proof</Btn>
              <Btn href="/developers/launchpad" variant="secondary">Partner Launchpad</Btn>
            </div>
          </div>
        </details>
      </ContentCard>

      <ContentCard title="Sandbox scope">
        <p style={copyStyle}>
          This uses the real application path and sandbox services. It does not complete a purchase, move funds, or grant production access.
        </p>
      </ContentCard>
    </RedesignPage>
  );
}
