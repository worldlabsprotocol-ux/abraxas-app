// FILE: app/api/admin/asset-signals/route.ts
// Asset monitoring v1 — ingest material state-change signals and apply credential actions.

import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/adminAuth";
import { applyAssetSignal } from "@/lib/assetMonitoring/apply";
import { evaluateAssetSignal } from "@/lib/assetMonitoring/evaluate";
import type { AssetSignal, AssetSignalType } from "@/lib/assetMonitoring/types";

const SIGNAL_TYPES: AssetSignalType[] = [
  "ownership_transfer",
  "lien_recorded",
  "appraisal_expired",
  "identity_ttl_expired",
  "listing_status_change",
  "manual_operator_flag",
];

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    asset_id?: string;
    signal_type?: AssetSignalType;
    source?: string;
    detail?: string;
    claim_ids?: string[];
    apply?: boolean;
    observed_at?: string;
  };

  if (!body.asset_id || !body.signal_type || !SIGNAL_TYPES.includes(body.signal_type)) {
    return NextResponse.json({ error: "asset_id and valid signal_type required" }, { status: 400 });
  }

  const signal: AssetSignal = {
    assetId: body.asset_id,
    signalType: body.signal_type,
    observedAt: body.observed_at ?? new Date().toISOString(),
    source: body.source ?? "admin_api",
    detail: body.detail,
    claimIds: body.claim_ids,
  };

  const preview = evaluateAssetSignal(signal);

  if (!body.apply) {
    return NextResponse.json({
      ok: true,
      mode: "preview",
      signal,
      decision: preview,
    });
  }

  if (!body.claim_ids?.length) {
    return NextResponse.json({ error: "claim_ids required when apply=true" }, { status: 400 });
  }

  const actor = req.headers.get("x-admin-pin") ?? "admin";
  const applied = await applyAssetSignal({
    signal,
    claimIds: body.claim_ids,
    changedBy: `asset_monitoring:${actor}`,
    idempotencyPrefix: `asset-signal:${body.asset_id}:${body.signal_type}`,
  });

  return NextResponse.json({
    ok: true,
    mode: "applied",
    signal,
    decision: applied.decision,
    results: applied.results,
  });
}
