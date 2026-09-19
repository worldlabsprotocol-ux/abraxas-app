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
        subtitle={`${ACCOUNT_ACCESS_FIRST_PAINT} Discover a pack, create an isolated sandbox app, generate a starter kit, then test. Production stays on the reviewed Launchpad path. Studio does not move funds.`}
      />
      <IntegrationStudioClient />
    </RedesignPage>
  );
}
