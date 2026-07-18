import type { Metadata } from "next";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { HubGrid } from "@/components/seo/HubGrid";
import { PLATFORM_PAGES } from "@/lib/categoryInfrastructure";

export const metadata: Metadata = {
  title: "Platform — Passport, Verify API, Policies | Abraxas",
  description: "The Abraxas platform: Passport credentials, verify API, trust policies, and monitoring — trust infrastructure for tokenized assets.",
};

export default function PlatformPage() {
  return (
    <RedesignPage maxWidth={900}>
      <PageHeader
        eyebrow="Platform"
        title="Trust infrastructure, productized"
        subtitle="Passport is the UX. Verify API, credentials, and policies are the infrastructure every RWA application integrates."
      />
      <HubGrid
        items={PLATFORM_PAGES.map(p => ({
          href: p.href,
          title: p.label,
          description: p.desc,
        }))}
      />
    </RedesignPage>
  );
}
