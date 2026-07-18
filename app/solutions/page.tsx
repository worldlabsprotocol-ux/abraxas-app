import type { Metadata } from "next";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { HubGrid } from "@/components/seo/HubGrid";
import { SOLUTION_PAGES } from "@/lib/categoryInfrastructure";

export const metadata: Metadata = {
  title: "Solutions — Trust Infrastructure by Vertical | Abraxas",
  description: "Real estate, mineral rights, royalties, private equity, stock tokens, and institutions — reusable verification per vertical.",
};

export default function SolutionsHubPage() {
  return (
    <RedesignPage maxWidth={900}>
      <PageHeader
        eyebrow="Solutions"
        title="Trust infrastructure by vertical"
        subtitle="Every RWA vertical repeats verification differently. Abraxas makes proof portable — with refresh triggers that match how each asset class actually changes."
      />
      <HubGrid
        items={SOLUTION_PAGES.map(s => ({
          href: `/solutions/${s.slug}`,
          title: s.vertical,
          description: s.problem,
        }))}
      />
    </RedesignPage>
  );
}
