// FILE: app/developers/integration-studio/page.tsx
// Public Integration Studio. One guided flow over existing Abraxas systems.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { IntegrationStudioOperationalProvider } from "@/components/developers/integrationStudioOperationalContext";
import { IntegrationStudioPageWorkspace } from "@/components/developers/IntegrationStudioPageWorkspace";
import { ACCOUNT_ACCESS_FIRST_PAINT } from "@/lib/product/publicOrigin";

export const dynamic = "force-dynamic";

export default function IntegrationStudioPage() {
  return (
    <RedesignPage accent="developer" maxWidth={1320} visualAtmosphere>
      <PageHeader
        eyebrow="Developers · Integration Studio"
        title="Your first integration"
        subtitle={`${ACCOUNT_ACCESS_FIRST_PAINT} Define policy, create a test app, run a holder step, receive a signed decision, and verify it independently before your app enforces permit, deny, or indeterminate.`}
      />
      <IntegrationStudioOperationalProvider>
        <IntegrationStudioPageWorkspace />
      </IntegrationStudioOperationalProvider>
    </RedesignPage>
  );
}
