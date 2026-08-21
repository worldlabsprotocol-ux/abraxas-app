// FILE: app/admin/partner-sandbox-demo/page.tsx

import { notFound } from "next/navigation";
import { isPartnerSandboxDemoEnabled } from "@/lib/demo/partnerSandboxDemoConfig";
import { isPartnerSandboxDemoOriginAllowed } from "@/lib/demo/partnerSandboxDemoEnvironmentGuard";
import { PartnerSandboxDemoClient } from "./PartnerSandboxDemoClient";

export const dynamic = "force-dynamic";

export default function PartnerSandboxDemoPage() {
  if (!isPartnerSandboxDemoEnabled() || !isPartnerSandboxDemoOriginAllowed()) {
    notFound();
  }

  return <PartnerSandboxDemoClient />;
}
