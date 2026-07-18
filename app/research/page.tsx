import type { Metadata } from "next";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { HubGrid } from "@/components/seo/HubGrid";
import { PILLAR_PAGES, RESEARCH_HUB_INTRO } from "@/lib/categoryInfrastructure";

const RESEARCH_SLUGS = new Set([
  "revocation-vs-refresh",
  "verification-infrastructure",
  "reusable-verification",
  "trust-infrastructure",
]);

export const metadata: Metadata = {
  title: "Research — Trust Infrastructure Technical Authority | Abraxas",
  description: RESEARCH_HUB_INTRO.subtitle,
};

export default function ResearchPage() {
  const items = PILLAR_PAGES.filter(p => RESEARCH_SLUGS.has(p.slug)).map(p => ({
    href: `/learn/${p.slug}`,
    title: p.title,
    description: p.aeoAnswer.slice(0, 120) + "…",
  }));

  return (
    <RedesignPage maxWidth={900}>
      <PageHeader eyebrow="Research" title={RESEARCH_HUB_INTRO.title} subtitle={RESEARCH_HUB_INTRO.subtitle} />
      <HubGrid items={items} />
    </RedesignPage>
  );
}
