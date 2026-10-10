"use client";
// FILE: app/good-trouble/page.tsx
// Good Trouble Cannabis pilot — batch provenance + retail eligibility integration.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { GoodTroubleBrowseSeekerDemoCTA } from "@/components/goodTrouble/GoodTroubleBrowseSeekerDemoCTA";
import { GoodTroublePilotSection } from "@/components/goodTrouble/GoodTroublePilotSection";
import { GOOD_TROUBLE_BRAND } from "@/lib/goodTrouble/constants";

export default function GoodTroublePage() {
  return (
    <RedesignPage accent="partner" maxWidth={900}>
      <PageHeader
        eyebrow="Good Trouble · Abraxas sandbox"
        title="Private 21+ eligibility"
        subtitle={`See how ${GOOD_TROUBLE_BRAND.name} can confirm an age requirement without receiving a birth date or identity documents.`}
      />
      <GoodTroubleBrowseSeekerDemoCTA />
      <GoodTroublePilotSection hideHeader />
    </RedesignPage>
  );
}
