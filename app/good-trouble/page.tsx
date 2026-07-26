"use client";
// FILE: app/good-trouble/page.tsx
// Good Trouble Cannabis pilot — batch provenance + retail eligibility integration.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { GoodTroublePilotSection } from "@/components/goodTrouble/GoodTroublePilotSection";
import { GOOD_TROUBLE_BRAND } from "@/lib/goodTrouble/constants";

export default function GoodTroublePage() {
  return (
    <RedesignPage maxWidth={900}>
      <PageHeader
        eyebrow="Integration pilot · Cannabis"
        title={`${GOOD_TROUBLE_BRAND.name} verification`}
        subtitle={`${GOOD_TROUBLE_BRAND.tagline} Organic cultivator in ${GOOD_TROUBLE_BRAND.location}. Part of the Abraxas regulated retail vertical — age eligibility + batch provenance.`}
      />
      <p style={{ fontFamily: "'Inter',system-ui,sans-serif", fontSize: "0.78rem", margin: "0 0 1.25rem" }}>
        <a href="/regulated-retail" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
          ← Cannabis & spirits verification overview
        </a>
      </p>
      <GoodTroublePilotSection hideHeader />
    </RedesignPage>
  );
}
