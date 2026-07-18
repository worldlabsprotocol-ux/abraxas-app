import type { Metadata } from "next";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { HubGrid } from "@/components/seo/HubGrid";
import { COMPARISON_PAGES } from "@/lib/categoryInfrastructure";

export const metadata: Metadata = {
  title: "Comparisons — Trust Infrastructure | Abraxas",
  description: "How Abraxas compares to traditional due diligence, issuance platforms, and repeated KYC — high-intent evaluation pages.",
};

export default function ComparisonsHubPage() {
  return (
    <RedesignPage maxWidth={900}>
      <PageHeader
        eyebrow="Comparisons"
        title="Evaluate trust infrastructure"
        subtitle="High-intent pages for buyers comparing verification approaches — honest layer separation, not FUD."
      />
      <HubGrid
        items={COMPARISON_PAGES.map(c => ({
          href: `/comparisons/${c.slug}`,
          title: c.title,
          description: c.thesis,
        }))}
      />
    </RedesignPage>
  );
}
