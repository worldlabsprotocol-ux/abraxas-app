import { ONCHAIN_GATE_NOT_DEPLOYER, ONCHAIN_GATE_SAFE_STATES } from "./contract";
import { projectOnchainGatePublic, safeStateFromRecord } from "./project";
import type { OnchainGateDeploymentRecord } from "./types";

export function onchainGateLaunchpadReadiness(records: OnchainGateDeploymentRecord[]) {
  const latest = records[0] ?? null;
  return {
    states: [...ONCHAIN_GATE_SAFE_STATES],
    safe_status: safeStateFromRecord(latest),
    deployments: records.map(projectOnchainGatePublic),
    live: false as const,
    deploys: false as const,
    circle_settlement: false as const,
    notice: ONCHAIN_GATE_NOT_DEPLOYER,
    docs: "/docs/onchain-gate-deployments",
  };
}
