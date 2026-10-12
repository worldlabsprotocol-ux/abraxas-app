// FILE: app/developers/integration-studio/page.tsx
// Public Integration Studio. One guided flow over existing Abraxas systems.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { IntegrationStudioClient } from "@/app/developers/integration-studio/IntegrationStudioClient";
import { IntegrationStudioWorkspace } from "@/components/developers/IntegrationStudioWorkspace";
import { ACCOUNT_ACCESS_FIRST_PAINT } from "@/lib/product/publicOrigin";

export const dynamic = "force-dynamic";

export default function IntegrationStudioPage() {
  return (
    <RedesignPage accent="developer" maxWidth={1320}>
      <PageHeader
        eyebrow="Developers · Integration Studio"
        title="Partner integration workspace"
        subtitle={`${ACCOUNT_ACCESS_FIRST_PAINT} Policy → sandbox → request → receipt → verification → production review.`}
      />
      <IntegrationStudioWorkspace
        inspector={
          <>
            <strong style={{ color: "var(--text-primary)" }}>Inspector</strong>
            <p style={{ margin: "0.5rem 0 0" }}>
              Request payloads, signed receipts, and webhook status appear in the panels below as you configure each path.
              Production activation requires operator review — no silent promotion from sandbox.
            </p>
          </>
        }
      >
        <IntegrationStudioClient />
      </IntegrationStudioWorkspace>
    </RedesignPage>
  );
}
