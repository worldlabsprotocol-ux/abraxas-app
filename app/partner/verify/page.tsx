// FILE: app/partner/verify/page.tsx
// Generic relying-party verification entry — configured per partner via query params.

import { Suspense } from "react";
import { PartnerVerifyClient } from "@/components/partner/PartnerVerifyClient";

export const dynamic = "force-dynamic";

export default function PartnerVerifyPage() {
  return (
    <div data-theme="dark" style={{ minHeight: "100vh", background: "var(--bg)", padding: "1rem" }}>
      <Suspense fallback={<p style={{ textAlign: "center", color: "var(--text-muted)" }}>Loading…</p>}>
        <PartnerVerifyClient />
      </Suspense>
    </div>
  );
}
