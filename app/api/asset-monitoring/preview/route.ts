// FILE: app/api/asset-monitoring/preview/route.ts
// Testable asset monitoring preview — evaluate signals without admin apply.

import { NextRequest, NextResponse } from "next/server";
import { evaluateAssetSignal } from "@/lib/assetMonitoring/evaluate";
import { runListingStatusFeed } from "@/lib/assetMonitoring/feeds/listingStatusFeed";
import { isProductionReferenceAsset } from "@/lib/authenticationProof/productionReference";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const assetId = req.nextUrl.searchParams.get("asset_id")?.trim().toUpperCase();
  if (!assetId) {
    return NextResponse.json(
      { error: "asset_id query param required (e.g. ABX-RE-HOSP-001)" },
      { status: 400 },
    );
  }

  const listingSignals = (await runListingStatusFeed(new Date())).filter(
    s => s.assetId === assetId,
  );
  const sampleSignal = listingSignals[0] ?? {
    assetId,
    signalType: "listing_status_change" as const,
    observedAt: new Date().toISOString(),
    source: "preview",
    detail: "Manual preview — no drift detected in live feeds",
  };

  const decision = evaluateAssetSignal(sampleSignal);

  return NextResponse.json({
    asset_id: assetId,
    production_reference: isProductionReferenceAsset(assetId),
    signal: sampleSignal,
    decision,
    proof_path: {
      apply_admin: "POST /api/admin/asset-signals with apply:true and claim_ids",
      auto_cron: "GET /api/cron/asset-monitoring when ASSET_MONITORING_AUTO_APPLY=true",
      on_apply: "Issues asset_state_change proof and marks prior proofs refresh_required/superseded",
    },
    listing_signals_found: listingSignals.length,
  });
}
