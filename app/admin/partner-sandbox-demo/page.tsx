// FILE: app/admin/partner-sandbox-demo/page.tsx

import { notFound } from "next/navigation";
import { isPartnerSandboxDemoEnabled } from "@/lib/demo/partnerSandboxDemoConfig";
import { PartnerSandboxDemoClient } from "./PartnerSandboxDemoClient";

export const dynamic = "force-dynamic";

export default function PartnerSandboxDemoPage() {
  if (!isPartnerSandboxDemoEnabled()) {
    notFound();
  }

  return <PartnerSandboxDemoClient />;
}
