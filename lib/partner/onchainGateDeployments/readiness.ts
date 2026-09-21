import { ONCHAIN_GATE_NOT_DEPLOYER, ONCHAIN_GATE_SAFE_STATES } from "./contract";
import { institutionalClassFromFlag, institutionalLabel } from "./institutional";
import { projectOnchainGatePublic, safeStateFromRecord } from "./project";
import type { OnchainGateDeploymentRecord } from "./types";

export function onchainGateLaunchpadReadiness(records: OnchainGateDeploymentRecord[]) {
  const latest = records[0] ?? null;
  const requireInstitutional = latest?.require_institutional === true;
  return {
    states: [...ONCHAIN_GATE_SAFE_STATES],
    safe_status: safeStateFromRecord(latest),
    require_institutional: requireInstitutional,
    institutional_class: latest ? institutionalClassFromFlag(requireInstitutional) : "standard",
    institutional_label: latest ? institutionalLabel(requireInstitutional) : institutionalLabel(false),
    deployments: records.map(projectOnchainGatePublic),
    live: false as const,
    deploys: false as const,
    circle_settlement: false as const,
    notice: ONCHAIN_GATE_NOT_DEPLOYER,
    docs: "/docs/onchain-gate-deployments",
  };
}
