// FILE: app/developers/integration-studio/page.tsx
// Public Integration Studio. One guided flow over existing Abraxas systems.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { IntegrationStudioClient } from "@/app/developers/integration-studio/IntegrationStudioClient";
import { ACCOUNT_ACCESS_FIRST_PAINT } from "@/lib/product/publicOrigin";

export const dynamic = "force-dynamic";

export default function IntegrationStudioPage() {
  return (
    <RedesignPage accent="developer" maxWidth={920}>
      <PageHeader
        eyebrow="Developers · Integration Studio"
        title="What does your application need to verify?"
        subtitle={`${ACCOUNT_ACCESS_FIRST_PAINT} Describe the eligibility requirement, review the privacy contract, configure the smallest policy, generate integration code, and test in sandbox. Production activation stays on the reviewed Launchpad path.`}
      />
      <IntegrationStudioClient />
    </RedesignPage>
  );
}
