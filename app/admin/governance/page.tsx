// Institutional governance console — read-only custody and migration observation.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { ControlPlanesAuthorityVisual } from "@/components/protocol-visuals";
import { InstitutionalGovernanceConsole } from "@/components/protocol/InstitutionalGovernanceConsole";

export const dynamic = "force-dynamic";

export default function AdminGovernancePage() {
  return (
    <RedesignPage accent="admin" maxWidth={1320}>
      <div className="abx-control-plane">
        <PageHeader
          eyebrow="Admin · Governance"
          title="Trust registry custody"
          subtitle="Separated authorities · devnet observation · execution disabled until authorized."
        />
        <div className="abx-surface-protocol-visual">
          <ControlPlanesAuthorityVisual />
        </div>
        <InstitutionalGovernanceConsole />
      </div>
    </RedesignPage>
  );
}
