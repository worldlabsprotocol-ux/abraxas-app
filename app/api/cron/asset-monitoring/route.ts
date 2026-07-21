// FILE: app/api/cron/asset-monitoring/route.ts
// Daily automated asset monitoring feeds (credential TTL + registry assurance).

import { NextRequest, NextResponse } from "next/server";
import { runAssetMonitoringFeeds } from "@/lib/assetMonitoring/runFeeds";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apply = process.env.ASSET_MONITORING_AUTO_APPLY === "true";

  try {
    const { signals, results } = await runAssetMonitoringFeeds({
      apply,
      changedBy: "cron:asset-monitoring",
    });

    const applied = results.filter(r => r.applied).length;
    const failed = results.filter(r => r.error).length;

    return NextResponse.json({
      success: true,
      apply,
      signalCount: signals.length,
      applied,
      failed,
      results,
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
