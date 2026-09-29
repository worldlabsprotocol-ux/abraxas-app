// FILE: app/demo/relying-party/callback/page.tsx

import { Suspense } from "react";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { RelyingPartyCallbackClient } from "@/components/demo/RelyingPartyCallbackClient";

export const dynamic = "force-dynamic";

export default function RelyingPartyPilotCallbackPage() {
  return (
    <RedesignPage accent="neutral" maxWidth={860}>
      <PageHeader
        eyebrow="Partner callback"
        title="Server-side receipt verification"
        subtitle="Fail closed unless the signed Abraxas receipt matches this partner, policy, and current validity checks."
      />
      <Suspense fallback={<p>Loading callback verification…</p>}>
        <RelyingPartyCallbackClient />
      </Suspense>
    </RedesignPage>
  );
}
