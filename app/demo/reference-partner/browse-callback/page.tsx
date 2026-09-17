// FILE: app/demo/reference-partner/browse-callback/page.tsx
// Abraxas-controlled DEMO reference-partner browse callback (L0 receipt only).

import { Suspense } from "react";
import { ReferencePartnerBrowseCallbackClient } from "@/components/demo/ReferencePartnerBrowseCallbackClient";

export const dynamic = "force-dynamic";

export default function ReferencePartnerBrowseCallbackPage() {
  return (
    <div data-theme="dark" style={{ minHeight: "100vh", background: "var(--bg)", padding: "1rem" }}>
      <Suspense fallback={<p style={{ textAlign: "center", color: "var(--text-muted)" }}>Loading…</p>}>
        <ReferencePartnerBrowseCallbackClient />
      </Suspense>
    </div>
  );
}
