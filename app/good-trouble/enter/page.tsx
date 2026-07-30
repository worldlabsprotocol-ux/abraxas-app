// FILE: app/good-trouble/enter/page.tsx
// Good Trouble reference callback — validates Abraxas session receipt and unlocks entry.

import { Suspense } from "react";
import { PartnerEnterClient } from "@/components/partner/PartnerEnterClient";
import { GOOD_TROUBLE_BRAND } from "@/lib/goodTrouble/constants";
import { GOOD_TROUBLE_INTEGRATION, goodTroubleVerifyUrl } from "@/lib/goodTrouble/partnerIntegration";

export const dynamic = "force-dynamic";

export default function GoodTroubleEnterPage() {
  return (
    <div data-theme="dark" style={{ minHeight: "100vh", background: "var(--bg)", padding: "1rem" }}>
      <Suspense fallback={<p style={{ textAlign: "center", color: "var(--text-muted)" }}>Loading…</p>}>
        <PartnerEnterClient
          partnerId={GOOD_TROUBLE_INTEGRATION.partnerId}
          partnerName={GOOD_TROUBLE_BRAND.name}
          verifyPath={goodTroubleVerifyUrl()}
        />
      </Suspense>
    </div>
  );
}
