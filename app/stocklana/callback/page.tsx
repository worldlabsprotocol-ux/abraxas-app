// FILE: app/stocklana/callback/page.tsx
// Return path after Abraxas hosted verification.

import { Suspense } from "react";
import { StocklanaCallbackClient } from "@/components/stocklana/StocklanaCallbackClient";

export const dynamic = "force-dynamic";

export default function StocklanaCallbackPage() {
  return (
    <Suspense fallback={<p style={{ padding: "2rem", textAlign: "center" }}>Validating eligibility…</p>}>
      <StocklanaCallbackClient />
    </Suspense>
  );
}
