// Institutional governance console — read-only custody and migration observation.

import { RedesignPage } from "@/components/redesign/RedesignPage";
import { PageHeader } from "@/components/redesign/RedesignContent";
import { InstitutionalGovernanceConsole } from "@/components/protocol/InstitutionalGovernanceConsole";

export const dynamic = "force-dynamic";

export default function AdminGovernancePage() {
  return (
    <RedesignPage accent="admin" maxWidth={1320}>
      <div className="abx-control-plane">
        <PageHeader
          eyebrow="Admin · Governance"
          title="Trust registry custody"
          subtitle="Devnet observation, Squads preflight, and migration gates. On-chain execution controls stay disabled until explicitly authorized."
        />
        <InstitutionalGovernanceConsole />
      </div>
    </RedesignPage>
  );
}
