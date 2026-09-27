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
        title="Create a sandbox integration"
        subtitle={`${ACCOUNT_ACCESS_FIRST_PAINT} Choose a policy, create an isolated sandbox, and run its hosted test. No wallet or identity login is needed for sandbox setup. Production stays on the reviewed Launchpad path.`}
      />
      <IntegrationStudioClient />
    </RedesignPage>
  );
}
