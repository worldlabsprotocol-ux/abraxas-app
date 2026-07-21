// FILE: lib/mainnetReadinessLive.ts
// Live mainnet gate overrides from production telemetry.

import { getAssetMonitoringGateStatus } from "@/lib/assetMonitoring/gateStatus";
import { MAINNET_READINESS_MILESTONES, type MainnetMilestone } from "@/lib/mainnetReadiness";
import { getExternalRpGateStatus } from "@/lib/relyingPartyProduction";
import { getBountyGateStatus } from "@/lib/security/bountyGateStatus";
import { getAuditGateStatus } from "@/lib/security/auditGateStatus";
import { isSuiMainnetDeployed } from "@/lib/sui/config";

export async function getLiveMainnetMilestones(): Promise<MainnetMilestone[]> {
  const [rpGate, monitoringGate, bountyGate, audits] = await Promise.all([
    getExternalRpGateStatus(1),
    getAssetMonitoringGateStatus(),
    getBountyGateStatus(),
    Promise.resolve(getAuditGateStatus()),
  ]);

  return MAINNET_READINESS_MILESTONES.map(milestone => {
    if (milestone.id === "unaffiliated-rp" && rpGate.met) {
      return { ...milestone, done: true };
    }
    if (milestone.id === "asset-monitoring-v1" && monitoringGate.met) {
      return { ...milestone, done: true };
    }
    if (milestone.id === "passport-mainnet-audit" && audits.passportMainnetAuditComplete) {
      return { ...milestone, done: true };
    }
    if (milestone.id === "credential-api-review" && audits.credentialApiReviewComplete) {
      return { ...milestone, done: true };
    }
    if (milestone.id === "passport-mainnet-deploy" && isSuiMainnetDeployed()) {
      return { ...milestone, done: true };
    }
    if (milestone.id === "open-integration-bounty" && bountyGate.met) {
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
