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
        title="Understand the request before you share anything"
        subtitle="Abraxas helps partners verify eligibility without collecting underlying identity data. Review what is asked, consent when ready, then return to the partner with an explicit action."
      />
      <Suspense fallback={<RedesignPageLoading label="Loading verification gateway…" />}>
        <VerificationGateway />
      </Suspense>
    </RedesignPage>
  );
}
