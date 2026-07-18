// FILE: app/api/mainnet/readiness/route.ts
// Live mainnet gate status — merges static checklist with production telemetry.

import { NextResponse } from "next/server";
import { getAssetMonitoringGateStatus } from "@/lib/assetMonitoring/gateStatus";
import { getLiveMainnetProgress } from "@/lib/mainnetReadinessLive";
import { getExternalRpGateStatus } from "@/lib/relyingPartyProduction";
import { getPositioningLoopStatus } from "@/lib/positioningLoop";

export const dynamic = "force-dynamic";

export async function GET() {
  const [progress, rpGate, monitoringGate, positioning] = await Promise.all([
    getLiveMainnetProgress(),
    getExternalRpGateStatus(3),
    getAssetMonitoringGateStatus(),
    getPositioningLoopStatus(),
  ]);

  return NextResponse.json({
    ...progress,
    telemetry: {
      externalRp: rpGate,
      assetMonitoring: monitoringGate,
      positioningLoop: {
        loopClosed: positioning.loopClosed,
        steps: positioning.steps.map(s => ({ id: s.id, state: s.state, detail: s.detail })),
        metrics: positioning.metrics,
      },
    },
  });
}
