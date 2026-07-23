"use client";
// FILE: app/community/page.tsx

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export default function CommunityPage() {
  return (
    <RedesignPage maxWidth={720}>
      <PageHeader
        eyebrow="Community"
        title="Build with us"
        subtitle="Design partners, asset owners, and relying parties. the Abraxas network grows through real integrations, not hype."
      />
      <ContentCard title="Join the loop">
        <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 1rem" }}>
          Community today means verified pilots: list an asset, integrate as a relying party, or follow the build in public.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/design-partner" size="sm">Become a relying party →</Btn>
          <Btn href="/build" variant="secondary" size="sm">Position an asset →</Btn>
          <Btn href="/integrations#apply" variant="ghost" size="sm">Apply as design partner →</Btn>
        </div>
      </ContentCard>
    </RedesignPage>
  );
}
