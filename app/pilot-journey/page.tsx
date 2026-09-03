"use client";
// FILE: app/pilot-journey/page.tsx
// Nontechnical pilot journey explanation — not a receipt tester.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { HOME_PARTNER_PROOF_FALLBACK } from "@/lib/home/partnerProof";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export default function PilotJourneyPage() {
  return (
    <RedesignPage maxWidth={720}>
      <PageHeader
        eyebrow="Pilot journey"
        title={HOME_PARTNER_PROOF_FALLBACK.title}
        subtitle={HOME_PARTNER_PROOF_FALLBACK.summary}
      />

      <ContentCard title="What this pilot tests">
        <p style={{ fontFamily: FONT, fontSize: "0.9rem", lineHeight: 1.65, color: "var(--text-secondary)", margin: 0 }}>
          A participating retailer can ask a customer to complete private eligibility verification with Abraxas before checkout.
          The customer receives a policy-specific result — not a copy of their identity documents.
        </p>
      </ContentCard>

      <ContentCard title="What this is not">
        <ul style={{ margin: 0, paddingLeft: "1.1rem", fontFamily: FONT, fontSize: "0.86rem", lineHeight: 1.65, color: "var(--text-secondary)" }}>
          <li>Not a claim of regulatory approval or production certification</li>
          <li>Not a public partner directory or operational dashboard</li>
          <li>Not a substitute for any legally required merchant-side ID check</li>
        </ul>
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
        <Btn href="/integrate" size="lg">For businesses</Btn>
        <Btn href="/docs/partner-flow" variant="secondary" size="lg">View developer docs</Btn>
      </div>
    </RedesignPage>
  );
}
