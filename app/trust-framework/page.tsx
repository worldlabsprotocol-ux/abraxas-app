// FILE: app/trust-framework/page.tsx
// Abraxas Trust Framework. institutional claim taxonomy.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { TrustFrameworkSection } from "@/components/vision/TrustFrameworkSection";
import { TrustIsTimeBoundSection } from "@/components/vision/TrustIsTimeBoundSection";
import { TrustFrameworkDemo } from "@/components/vision/TrustFrameworkDemo";

export default function TrustFrameworkPage() {
  return (
    <RedesignPage>
      <PageHeader
        eyebrow="Verification standards"
        title="Abraxas Trust Framework"
        subtitle="Separate issuers, assurance levels, and expiry. plus how trust stays current when records change."
      />
      <TrustFrameworkDemo />
      <TrustIsTimeBoundSection />
      <TrustFrameworkSection />
    </RedesignPage>
  );
}
