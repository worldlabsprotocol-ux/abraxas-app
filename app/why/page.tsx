// FILE: app/why/page.tsx
// Why Abraxas — category explanation for buyers (distinct from /proof evidence).

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { WhyAbraxasContent } from "@/components/gtm/WhyAbraxasContent";
import { pageMetadata } from "@/lib/seo/metadata";
import { GTM_ONE_SENTENCE_DESCRIPTION } from "@/lib/gtm/contract";

export const metadata = pageMetadata({
  title: "Why Abraxas — reusable verification without replacing KYC",
  description: GTM_ONE_SENTENCE_DESCRIPTION,
  path: "/why",
});

export default function WhyPage() {
  return (
    <RedesignPage accent="developer" maxWidth={880}>
      <PageHeader
        eyebrow="Why Abraxas"
        title="Reuse verification without passing identity files between apps"
        subtitle="Keep your existing KYC provider. Abraxas controls what each application is allowed to learn from trusted evidence — with server-verifiable results, freshness, consent, and revocation."
      />
      <WhyAbraxasContent />
    </RedesignPage>
  );
}
