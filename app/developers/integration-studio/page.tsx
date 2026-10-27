// FILE: app/developers/integration-studio/page.tsx
// Public Integration Studio. One guided flow over existing Abraxas systems.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { IntegrationStudioClient } from "@/app/developers/integration-studio/IntegrationStudioClient";
import { IntegrationStudioWorkspace } from "@/components/developers/IntegrationStudioWorkspace";
import { IntegrationStudioOperationalProvider } from "@/components/developers/integrationStudioOperationalContext";
import { IntegrationStudioInspectorRail } from "@/components/developers/IntegrationStudioInspectorRail";
import { ACCOUNT_ACCESS_FIRST_PAINT } from "@/lib/product/publicOrigin";

export const dynamic = "force-dynamic";

export default function IntegrationStudioPage() {
  return (
    <RedesignPage accent="developer" maxWidth={1320}>
      <PageHeader
        eyebrow="Developers · Integration Studio"
        title="Your first integration"
        subtitle={`${ACCOUNT_ACCESS_FIRST_PAINT} Choose what to verify, create a test app, send a request, receive a signed proof, and check it independently.`}
      />
      <IntegrationStudioOperationalProvider>
        <IntegrationStudioWorkspace inspector={<IntegrationStudioInspectorRail />}>
          <IntegrationStudioClient />
        </IntegrationStudioWorkspace>
      </IntegrationStudioOperationalProvider>
    </RedesignPage>
  );
}
