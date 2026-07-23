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
        subtitle={`${GOOD_TROUBLE_BRAND.tagline} Organic cultivator in ${GOOD_TROUBLE_BRAND.location}. Abraxas Passport retail gate + batch provenance SDK foundation.`}
      />
      <GoodTroublePilotSection hideHeader />
    </RedesignPage>
  );
}
