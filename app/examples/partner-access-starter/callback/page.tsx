// FILE: app/examples/partner-access-starter/callback/page.tsx
import { Suspense } from "react";
import { CallbackClient } from "./CallbackClient";

export const dynamic = "force-dynamic";

export default function PartnerAccessCallbackPage() {
  return (
    <Suspense fallback={<p style={{ padding: "2rem" }}>Loading callback…</p>}>
      <CallbackClient />
    </Suspense>
  );
}
