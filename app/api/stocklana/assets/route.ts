// FILE: app/api/stocklana/assets/route.ts
// Stocklana asset catalog + optional on-chain mint verification.

import { NextRequest, NextResponse } from "next/server";
import { STOCKLANA_ASSET_CATALOG, getStocklanaAsset } from "@/lib/stocklana/catalog";
import { STOCKLANA_NO_PRESTOCKS_API_NOTICE } from "@/lib/stocklana/constants";
import { verifyStocklanaMintOnChain } from "@/lib/stocklana/verifyMint";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const assetId = req.nextUrl.searchParams.get("asset");
  const mint = req.nextUrl.searchParams.get("mint");
  const verify = req.nextUrl.searchParams.get("verify") === "1";

  if (!assetId && !mint) {
    return NextResponse.json({
      ok: true,
      notice: STOCKLANA_NO_PRESTOCKS_API_NOTICE,
      assets: STOCKLANA_ASSET_CATALOG,
    });
  }

  const asset = assetId ? getStocklanaAsset(assetId) : STOCKLANA_ASSET_CATALOG.find((a) => a.mint === mint);
  if (!asset) {
    return NextResponse.json({ ok: false, code: "asset_not_found" }, { status: 404 });
  }

  const payload: Record<string, unknown> = { ok: true, asset };
  if (verify) {
    payload.on_chain = await verifyStocklanaMintOnChain({ mint: asset.mint, assetId: asset.id });
  }

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
