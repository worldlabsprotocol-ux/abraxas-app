// FILE: app/partner/verify/page.tsx
// Generic relying-party verification entry — configured per partner via query params.

import { Suspense } from "react";
import { PartnerVerifyClient } from "@/components/partner/PartnerVerifyClient";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";

export const dynamic = "force-dynamic";

export default function PartnerVerifyPage() {
  return (
    <div data-theme="dark" style={{ minHeight: "100vh", background: "var(--bg)", padding: "1rem" }}>
      <Suspense fallback={<RedesignPageLoading label="Loading verification…" compact />}>
        <PartnerVerifyClient />
      </Suspense>
    </div>
  );
}
