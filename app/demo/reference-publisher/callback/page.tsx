// FILE: app/demo/reference-publisher/callback/page.tsx
// Publisher callback — server verifies receipt, then resumes publishing intent.

import { Suspense } from "react";
import { ReferencePublisherCallbackClient } from "@/components/demo/referenceContentPublisher/ReferencePublisherCallbackClient";

export const dynamic = "force-dynamic";

export default function ReferencePublisherCallbackPage() {
  return (
    <Suspense fallback={<p style={{ padding: "2rem", textAlign: "center" }}>Returning to publisher…</p>}>
      <ReferencePublisherCallbackClient />
    </Suspense>
  );
}
