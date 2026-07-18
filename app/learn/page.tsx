import type { Metadata } from "next";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { HubGrid } from "@/components/seo/HubGrid";
import { LEARN_HUB_INTRO, PILLAR_PAGES, TOOLS } from "@/lib/categoryInfrastructure";

export const metadata: Metadata = {
  title: "Learn — Trust Infrastructure for RWAs | Abraxas",
  description: LEARN_HUB_INTRO.subtitle,
};

export default function LearnHubPage() {
  return (
    <RedesignPage maxWidth={900}>
      <PageHeader title={LEARN_HUB_INTRO.title} subtitle={LEARN_HUB_INTRO.subtitle} eyebrow="Category creation" />
      <HubGrid
        items={PILLAR_PAGES.map(p => ({
          href: `/learn/${p.slug}`,
          title: p.title,
          description: p.aeoAnswer.slice(0, 140) + "…",
        }))}
      />
      <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: "var(--fs-h2)", fontWeight: 800, margin: "0 0 0.75rem" }}>Interactive tools</h2>
      <p style={{ fontFamily: "'Inter',sans-serif", fontSize: "0.84rem", color: "var(--text-secondary)", margin: "0 0 1rem", maxWidth: 560 }}>
        Calculators and checklists that earn links and shares.
      </p>
      <HubGrid items={TOOLS.map(t => ({ href: t.href, title: t.title, description: t.description }))} />
    </RedesignPage>
  );
}
