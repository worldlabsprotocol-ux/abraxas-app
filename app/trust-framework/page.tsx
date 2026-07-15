// FILE: app/trust-framework/page.tsx
// Abraxas Trust Framework — institutional claim taxonomy.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { TrustFrameworkSection } from "@/components/vision/TrustFrameworkSection";
import { TrustIsTimeBoundSection } from "@/components/vision/TrustIsTimeBoundSection";

export default function TrustFrameworkPage() {
  return (
    <RedesignPage>
      <PageHeader
        eyebrow="Verification standards"
        title="Abraxas Trust Framework"
        subtitle="Claim-based verification for permissioned finance — separate issuers, assurance levels, expiry, and refresh when records change."
      />
      <TrustIsTimeBoundSection />
      <TrustFrameworkSection />
    </RedesignPage>
  );
}
