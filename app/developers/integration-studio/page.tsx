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
        title="Understand the contract, then integrate"
        subtitle={`${ACCOUNT_ACCESS_FIRST_PAINT} Choose a policy pack, pick a path, and reuse Partner Flow, receipts, events, and the Solana adapter. Studio does not issue keys or move funds.`}
      />
      <IntegrationStudioClient />
    </RedesignPage>
  );
}
