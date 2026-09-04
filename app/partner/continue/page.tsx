import { Suspense } from "react";
import { PartnerContinueClient } from "@/components/partner/PartnerContinueClient";

export default function PartnerContinuePage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <PartnerContinueClient />
    </Suspense>
  );
}
