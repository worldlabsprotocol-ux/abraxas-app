// FILE: app/verification/page.tsx
// Holder-first verification gateway.

import { Suspense } from "react";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import { VerificationGateway } from "@/components/verification/VerificationGateway";

export const dynamic = "force-dynamic";

export default function VerificationPage() {
  return (
    <RedesignPage accent="passport" maxWidth={820}>
      <PageHeader
        eyebrow="Verification"
        title="Review before you consent"
        subtitle="Start with a partner request. Check its details before choosing whether to continue."
        accent="passport"
      />
      <Suspense fallback={<RedesignPageLoading label="Loading verification gateway…" />}>
        <VerificationGateway />
      </Suspense>
    </RedesignPage>
  );
}
