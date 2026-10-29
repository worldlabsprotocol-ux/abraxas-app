// FILE: app/developers/integration-studio/page.tsx
// Public Integration Studio. One guided flow over existing Abraxas systems.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { IntegrationStudioPublicPage } from "@/components/developers/IntegrationStudioPublicPage";

export const dynamic = "force-dynamic";

export default function IntegrationStudioPage() {
  return (
    <RedesignPage accent="developer" maxWidth={1320} visualAtmosphere>
      <IntegrationStudioPublicPage />
    </RedesignPage>
  );
}
