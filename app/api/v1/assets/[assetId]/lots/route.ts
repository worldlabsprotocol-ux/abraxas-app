// FILE: app/api/v1/assets/[assetId]/lots/route.ts
// Public read API for MLS lot inventory.

import { NextRequest, NextResponse } from "next/server";
import { getLotInventory } from "@/lib/listingInventory/lotInventory";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  const inventory = await getLotInventory(assetId);

  if (!inventory.lots.length) {
    return NextResponse.json({ error: "No lot inventory for asset" }, { status: 404 });
  }

  return NextResponse.json(inventory);
}
