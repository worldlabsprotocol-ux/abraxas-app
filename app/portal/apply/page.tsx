"use client";
// FILE: app/portal/apply/page.tsx
// Self-serve owner launch — zkLogin + instant registry listing (no waiting queue).

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { Btn } from "@/components/redesign/ui";
import { SuiAuthProvider } from "@/components/sui/SuiAuthProvider";
import { OwnerAssetLaunchWizard } from "@/components/portal/OwnerAssetLaunchWizard";

function ApplyContent() {
  const searchParams = useSearchParams();
  const fromOAuth = searchParams.get("step") === "asset";

  return (
    <RedesignPage maxWidth={720}>
      <PageHeader
        eyebrow="Owner portal · Launch"
        title={fromOAuth ? "Welcome back — finish your listing" : "List your asset or business"}
        subtitle="Same sign-in as Passport. Publish to the Abraxas registry in minutes — your listing appears on the homepage explorer immediately. Abraxas review is optional when you want full verification."
      />

      <Suspense fallback={null}>
        <OwnerAssetLaunchWizard />
      </Suspense>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1.25rem", marginBottom: "2rem" }}>
        <Btn href="/portal/journey" variant="secondary" size="sm">Continue journey →</Btn>
        <Btn href="/portal/status" variant="secondary" size="sm">Track status →</Btn>
        <Btn href="/portal" variant="ghost" size="sm">← Owner portal</Btn>
      </div>
    </RedesignPage>
  );
}

export default function PortalApplyPage() {
  return (
    <SuiAuthProvider>
      <Suspense fallback={null}>
        <ApplyContent />
      </Suspense>
    </SuiAuthProvider>
  );
}
