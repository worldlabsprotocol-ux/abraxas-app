// FILE: app/api/mainnet/readiness/route.ts
// Live mainnet gate status — merges static checklist with production telemetry.

import { NextResponse } from "next/server";
import { getAssetMonitoringGateStatus } from "@/lib/assetMonitoring/gateStatus";
import { getLiveMainnetProgress } from "@/lib/mainnetReadinessLive";
import { getExternalRpGateStatus } from "@/lib/relyingPartyProduction";
import { getPositioningLoopStatus } from "@/lib/positioningLoop";
import { getBountyGateStatus } from "@/lib/security/bountyGateStatus";
import { getAuditGateStatus } from "@/lib/security/auditGateStatus";
import { getPublicSuiConfig } from "@/lib/sui/network";
import { isSuiMainnetDeployed } from "@/lib/sui/config";
import { getSuiMainnetDeployPath } from "@/lib/sui/mainnetDeployPath";
import { AUTHENTICATION_PROOF_LOOP_STATUS } from "@/lib/authenticationProof/loopStatus";
import { getVerificationLayerStatus } from "@/lib/authenticationProof/verificationLayerStatus";
import { verificationLayerProgress } from "@/lib/authenticationProof/verificationLayerProgress";
import { loadReceiptSigningKey } from "@/lib/decisionReceipts/signing";
import { getIndependentIdvStatus } from "@/lib/idv/independentIdvStatus";

export const dynamic = "force-dynamic";

export async function GET() {
  const [progress, rpGate, monitoringGate, positioning, bountyGate, audits, verificationLayer, independentIdv] =
    await Promise.all([
    getLiveMainnetProgress(),
    getExternalRpGateStatus(3),
    getAssetMonitoringGateStatus(),
    getPositioningLoopStatus(),
    getBountyGateStatus(),
    Promise.resolve(getAuditGateStatus()),
    getVerificationLayerStatus(),
    getIndependentIdvStatus(),
  ]);

  const sui = getPublicSuiConfig();
  const suiMainnetPath = getSuiMainnetDeployPath();
  const layerProgress = verificationLayerProgress(verificationLayer);

  return NextResponse.json({
    ...progress,
    verification_layer_progress: layerProgress,
    independent_idv: independentIdv,
    sui_mainnet_path: {
      summary: suiMainnetPath.summary,
      ready_for_cutover: suiMainnetPath.ready_for_mainnet_cutover,
      next_actions: suiMainnetPath.next_actions,
      api: "/api/sui/mainnet/readiness",
    },
    telemetry: {
      sui: { ...sui, mainnet_deployed: isSuiMainnetDeployed() },
      audits,
      externalRp: rpGate,
      assetMonitoring: monitoringGate,
      bounty: bountyGate,
      authenticationProof: {
        signing_configured: Boolean(loadReceiptSigningKey()),
        loop: AUTHENTICATION_PROOF_LOOP_STATUS,
        verificationLayer,
      },
      notify_configured: Boolean(process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL),
      positioningLoop: {
        loopClosed: positioning.loopClosed,
        steps: positioning.steps.map(s => ({ id: s.id, state: s.state, detail: s.detail })),
        metrics: positioning.metrics,
      },
    },
  });
}
