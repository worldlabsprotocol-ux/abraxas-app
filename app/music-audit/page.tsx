"use client";
// FILE: app/music-audit/page.tsx
// Music & IP royalty audit — moved off homepage for verification-first focus.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { MusicRoyaltySection } from "@/components/redesign/MusicRoyaltySection";

export default function MusicAuditPage() {
  return (
    <RedesignPage maxWidth={1180}>
      <PageHeader
        eyebrow="For creators"
        title="Music & IP royalty audit"
        subtitle="Find unclaimed royalties in your catalog. Moved here so the main Assets page stays focused on verification and verified assets."
      />
      <MusicRoyaltySection hideHeader />
    </RedesignPage>
  );
}
