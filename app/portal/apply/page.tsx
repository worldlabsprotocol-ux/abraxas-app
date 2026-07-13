"use client";
// FILE: app/portal/apply/page.tsx
// Land developer / owner intake with post-submit status tracking.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { LandDeveloperApplyForm } from "@/components/portal/LandDeveloperApplyForm";

export default function PortalApplyPage() {
  return (
    <RedesignPage maxWidth={720}>
      <PageHeader
        eyebrow="Owner portal · Intake"
        title="Land & asset owner application"
        subtitle="Submit once for Abraxas registry review. You will land on your status page immediately — save the link."
      />

      <ContentCard title="Before you submit">
        <LandDeveloperApplyForm />
      </ContentCard>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "2rem" }}>
        <Btn href="/portal/status" variant="secondary" size="sm">Already submitted? Track status →</Btn>
        <Btn href="/portal" variant="ghost" size="sm">← Owner portal</Btn>
      </div>
    </RedesignPage>
  );
}
