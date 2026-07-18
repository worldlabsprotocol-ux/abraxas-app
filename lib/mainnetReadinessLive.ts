// FILE: lib/mainnetReadinessLive.ts
// Live mainnet gate overrides from production telemetry.

import { MAINNET_READINESS_MILESTONES, type MainnetMilestone } from "@/lib/mainnetReadiness";
import { getExternalRpGateStatus } from "@/lib/relyingPartyProduction";

export async function getLiveMainnetMilestones(): Promise<MainnetMilestone[]> {
  const rpGate = await getExternalRpGateStatus(1);

  return MAINNET_READINESS_MILESTONES.map(milestone => {
    if (milestone.id === "unaffiliated-rp" && rpGate.met) {
      return { ...milestone, done: true };
    }
    return milestone;
  });
}

export async function getLiveMainnetProgress() {
  const milestones = await getLiveMainnetMilestones();
  const total = milestones.length;
  const done = milestones.filter(m => m.done).length;
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    isFullyReady: done === total,
    milestones,
  };
}
