// FILE: app/partner/continue/page.tsx
import { Suspense } from "react";
import { AccountAccessFirstPaint } from "@/components/product/AccountAccessFirstPaint";
import { PartnerContinueClient } from "@/components/partner/PartnerContinueClient";

export default function PartnerContinuePage() {
  return (
    <Suspense fallback={<AccountAccessFirstPaint />}>
      <PartnerContinueClient />
    </Suspense>
  );
}
