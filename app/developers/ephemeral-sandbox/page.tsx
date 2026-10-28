// FILE: app/developers/ephemeral-sandbox/page.tsx

import { Suspense } from "react";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { EphemeralSandboxPageHeader } from "@/components/account/EphemeralSandboxPageHeader";
import { EphemeralSandboxWorkspaceClient } from "@/components/account/EphemeralSandboxWorkspaceClient";

export const dynamic = "force-dynamic";

export default function EphemeralSandboxPage() {
  return (
    <RedesignPage accent="developer" maxWidth={1320} visualAtmosphere>
      <Suspense fallback={null}>
        <EphemeralSandboxPageHeader />
      </Suspense>
      <Suspense
        fallback={
          <p role="status">Loading workspace…</p>
        }
      >
        <EphemeralSandboxWorkspaceClient />
      </Suspense>
    </RedesignPage>
  );
}
