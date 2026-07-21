// FILE: app/api/admin/listings/lots/route.ts
// Admin lot inventory read + manual override.

import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/adminAuth";
import { applyLotStatusUpdates } from "@/lib/listingInventory/applyLotUpdates";
import { getLotInventory, getLotStatusEvents } from "@/lib/listingInventory/lotInventory";
import type { LotStatus, LotStatusUpdate } from "@/lib/listingInventory/types";

const VALID_STATUSES: LotStatus[] = ["available", "under_contract", "contingent", "sold"];

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assetId = req.nextUrl.searchParams.get("asset_id") ?? "ABX-RE-LAND-006";
  const [inventory, events] = await Promise.all([
    getLotInventory(assetId),
    getLotStatusEvents(assetId, 25),
  ]);

  return NextResponse.json({ inventory, events });
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    asset_id?: string;
    lots?: LotStatusUpdate[];
    idempotency_key?: string;
  };

  if (!body.asset_id || !body.lots?.length) {
    return NextResponse.json({ error: "asset_id and lots[] required" }, { status: 400 });
  }

  for (const lot of body.lots) {
    if (!lot.lot) {
      return NextResponse.json({ error: "Each lot update requires lot number" }, { status: 400 });
    }
    if (lot.status && !VALID_STATUSES.includes(lot.status)) {
      return NextResponse.json({ error: `Invalid status for lot ${lot.lot}` }, { status: 400 });
    }
  }

  const actor = req.headers.get("x-admin-pin") ?? "admin";
  const applied = await applyLotStatusUpdates({
    assetId: body.asset_id,
    updates: body.lots,
    source: `admin:${actor}`,
    idempotencyKey: body.idempotency_key ?? `admin:${Date.now()}`,
  });

  return NextResponse.json({ ok: true, ...applied });
}
