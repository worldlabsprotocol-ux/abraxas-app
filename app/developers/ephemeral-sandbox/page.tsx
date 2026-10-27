// FILE: app/developers/ephemeral-sandbox/page.tsx

import { Suspense } from "react";
import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { EphemeralSandboxWorkspaceClient } from "@/components/account/EphemeralSandboxWorkspaceClient";
import {
  EPHEMERAL_WORKSPACE_PAGE_EYEBROW,
  EPHEMERAL_WORKSPACE_PAGE_SUBTITLE,
  EPHEMERAL_WORKSPACE_PAGE_TITLE,
} from "@/lib/developers/ephemeralWorkspaceCopy";

export const dynamic = "force-dynamic";

export default function EphemeralSandboxPage() {
  return (
    <RedesignPage accent="developer" maxWidth={1320}>
      <PageHeader
        eyebrow={EPHEMERAL_WORKSPACE_PAGE_EYEBROW}
        title={EPHEMERAL_WORKSPACE_PAGE_TITLE}
        subtitle={EPHEMERAL_WORKSPACE_PAGE_SUBTITLE}
      />
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
