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
import { AUTHENTICATION_PROOF_LOOP_STATUS } from "@/lib/authenticationProof/loopStatus";
import { loadReceiptSigningKey } from "@/lib/decisionReceipts/signing";

export const dynamic = "force-dynamic";

export async function GET() {
  const [progress, rpGate, monitoringGate, positioning, bountyGate, audits] = await Promise.all([
    getLiveMainnetProgress(),
    getExternalRpGateStatus(3),
    getAssetMonitoringGateStatus(),
    getPositioningLoopStatus(),
    getBountyGateStatus(),
    Promise.resolve(getAuditGateStatus()),
  ]);

  const sui = getPublicSuiConfig();

  return NextResponse.json({
    ...progress,
    telemetry: {
      sui: { ...sui, mainnet_deployed: isSuiMainnetDeployed() },
      audits,
      externalRp: rpGate,
      assetMonitoring: monitoringGate,
      bounty: bountyGate,
      authenticationProof: {
        signing_configured: Boolean(loadReceiptSigningKey()),
        loop: AUTHENTICATION_PROOF_LOOP_STATUS,
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
