// FILE: app/api/v1/listings/lot-status/route.ts
// Partner MLS push — update lot inventory for monitored assets.

import { NextRequest, NextResponse } from "next/server";
import { applyLotStatusUpdates } from "@/lib/listingInventory/applyLotUpdates";
import { isMonitoredLotAsset } from "@/lib/listingInventory/staticLots";
import type { LotStatus, LotStatusUpdate } from "@/lib/listingInventory/types";
import { authenticatePartner } from "@/lib/partner/partnerAuth";

const VALID_STATUSES: LotStatus[] = ["available", "under_contract", "contingent", "sold"];

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
    lots?: LotStatusUpdate[];
    idempotency_key?: string;
    observed_at?: string;
  };

  if (!body.asset_id || !body.lots?.length) {
    return NextResponse.json({ error: "asset_id and lots[] required" }, { status: 400 });
  }

  if (!isMonitoredLotAsset(body.asset_id)) {
    return NextResponse.json({ error: "Asset not configured for lot inventory" }, { status: 404 });
  }

  for (const lot of body.lots) {
    if (!lot.lot || typeof lot.lot !== "number") {
      return NextResponse.json({ error: "Each lot update requires lot number" }, { status: 400 });
    }
    if (lot.status && !VALID_STATUSES.includes(lot.status)) {
      return NextResponse.json({ error: `Invalid status for lot ${lot.lot}` }, { status: 400 });
    }
  }

  const applied = await applyLotStatusUpdates({
    assetId: body.asset_id,
    updates: body.lots,
    source: `partner:${auth.ctx.partnerId}`,
    partnerId: auth.ctx.partnerId,
    idempotencyKey: body.idempotency_key,
    observedAt: body.observed_at,
  });

  return NextResponse.json({
    ok: true,
    asset_id: body.asset_id,
    fingerprint: applied.fingerprint,
    changed: applied.changed,
    results: applied.results,
    partner_id: auth.ctx.partnerId,
  });
}
