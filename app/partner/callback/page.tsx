// FILE: app/partner/callback/page.tsx
// Launchpad sandbox / acceptance partner return URL.

import { Suspense } from "react";
import { AccountAccessFirstPaint } from "@/components/product/AccountAccessFirstPaint";
import { PartnerSandboxCallbackClient } from "@/components/partner/PartnerSandboxCallbackClient";

export default function PartnerSandboxCallbackPage() {
  return (
    <Suspense fallback={<AccountAccessFirstPaint />}>
      <PartnerSandboxCallbackClient />
    </Suspense>
  );
}
