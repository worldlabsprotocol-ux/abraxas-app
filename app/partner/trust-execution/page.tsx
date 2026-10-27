// FILE: app/partner/trust-execution/page.tsx

import { Suspense } from "react";
import { PartnerTrustExecutionHolderClient } from "@/components/partner/PartnerTrustExecutionHolderClient";
import { RedesignPageLoading } from "@/components/redesign/RedesignPageLoading";
import { RedesignNav } from "@/components/redesign/RedesignNav";
import { RedesignFooter } from "@/components/redesign/RedesignFooter";

export const dynamic = "force-dynamic";

export default function PartnerTrustExecutionPage() {
  return (
    <div data-theme="dark" className="abx-institutional-shell abx-v2-shell">
      <RedesignNav />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
        <Suspense fallback={<RedesignPageLoading label="Loading authorization…" compact />}>
          <PartnerTrustExecutionHolderClient />
        </Suspense>
      </main>
      <RedesignFooter />
    </div>
  );
}
