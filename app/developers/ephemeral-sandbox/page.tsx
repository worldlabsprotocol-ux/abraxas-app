// FILE: app/developers/ephemeral-sandbox/page.tsx

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader, ContentCard } from "@/components/redesign/RedesignContent";
import { EphemeralSandboxWorkspaceClient } from "@/components/account/EphemeralSandboxWorkspaceClient";

export const dynamic = "force-dynamic";

export default function EphemeralSandboxPage() {
  return (
    <RedesignPage accent="neutral" maxWidth={720}>
      <PageHeader
        eyebrow="Developers"
        title="Temporary sandbox"
        subtitle="Wallet-signed ephemeral access for integration experiments. No durable personal account is created."
      />
      <ContentCard>
        <EphemeralSandboxWorkspaceClient />
      </ContentCard>
    </RedesignPage>
  );
}
