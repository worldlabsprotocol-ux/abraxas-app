// FILE: app/developers/institutional-integration/page.tsx

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { InstitutionalIntegrationClient } from "./InstitutionalIntegrationClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Institutional integration workspace · Abraxas Developers",
  description:
    "Configure sandbox institutional protocol access, obtain the verification SDK, pin issuer trust, and connect signed decision receipts to your application.",
};

export default function InstitutionalIntegrationPage() {
  return (
    <RedesignPage accent="developer" maxWidth={960}>
      <InstitutionalIntegrationClient />
    </RedesignPage>
  );
}
