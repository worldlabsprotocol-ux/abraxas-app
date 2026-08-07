// FILE: app/examples/partner-access-starter/callback/page.tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isStarterRuntimeEnabled } from "@/examples/partner-access-nextjs-starter/lib/runtimeGate";
import { CallbackClient } from "./CallbackClient";

export const dynamic = "force-dynamic";

export default function PartnerAccessCallbackPage() {
  if (!isStarterRuntimeEnabled()) {
    notFound();
  }

  return (
    <Suspense fallback={<p style={{ padding: "2rem" }}>Loading callback…</p>}>
      <CallbackClient />
    </Suspense>
  );
}
