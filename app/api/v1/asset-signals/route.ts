// FILE: app/api/v1/asset-signals/route.ts
// Partner webhook — ingest material asset state-change signals.

import { NextRequest, NextResponse } from "next/server";
import { applyAssetSignal } from "@/lib/assetMonitoring/apply";
import { evaluateAssetSignal } from "@/lib/assetMonitoring/evaluate";
import { resolveClaimIdsForAsset } from "@/lib/assetMonitoring/resolveClaims";
import type { AssetSignal, AssetSignalType } from "@/lib/assetMonitoring/types";
import { authenticatePartner } from "@/lib/partner/partnerAuth";

const SIGNAL_TYPES: AssetSignalType[] = [
  "ownership_transfer",
  "lien_recorded",
  "appraisal_expired",
  "identity_ttl_expired",
  "listing_status_change",
  "manual_operator_flag",
];

export async function POST(req: NextRequest) {
  const auth = await authenticatePartner(req, "verify:credential");
  if (!auth) {
    return NextResponse.json({ error: "Partner API key required" }, { status: 401 });
  }
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({})) as {
    asset_id?: string;
    signal_type?: AssetSignalType;
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
    source: `partner:${auth.ctx.partnerId}`,
    detail: body.detail,
    claimIds: body.claim_ids,
  };

  const preview = evaluateAssetSignal(signal);

  if (!body.apply) {
    return NextResponse.json({ ok: true, mode: "preview", signal, decision: preview });
  }

  const claimIds = body.claim_ids?.length
    ? body.claim_ids
    : await resolveClaimIdsForAsset(body.asset_id);

  if (!claimIds.length) {
    return NextResponse.json({ error: "No active claims found for asset_id" }, { status: 404 });
  }

  const applied = await applyAssetSignal({
    signal: { ...signal, claimIds },
    claimIds,
    changedBy: `partner_webhook:${auth.ctx.partnerId}`,
    idempotencyPrefix: `partner:${auth.ctx.partnerId}:${body.asset_id}`,
  });

  return NextResponse.json({
    ok: true,
    mode: "applied",
    signal,
    decision: applied.decision,
    results: applied.results,
  });
}
