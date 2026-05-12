// FILE: app/api/borrow/route.ts
// Borrow USDC against a listed/collateralized asset.
// Validates LTV, updates position, records transaction, emits event.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { wallet, assetId, borrowAmountUsd } = await req.json();
    if (!wallet || !assetId || !borrowAmountUsd) {
      return NextResponse.json({ error: "wallet, assetId, borrowAmountUsd required" }, { status: 400 });
    }

    // Fetch asset to validate LTV
    const { data: asset, error: assetErr } = await supabase
      .from("assets").select("*").eq("id", assetId).single();
    if (assetErr || !asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    if (!["listed","collateralized"].includes(asset.status)) {
      return NextResponse.json({ error: "Asset not eligible for borrowing" }, { status: 400 });
    }

    const maxBorrow = Math.round(asset.price_usd * asset.ltv / 100);
    if (borrowAmountUsd > maxBorrow) {
      return NextResponse.json({ error: `Exceeds max LTV. Max borrow: $${maxBorrow}` }, { status: 400 });
    }

    // Record borrow transaction
    const { error: txErr } = await supabase.from("transactions").insert({
      wallet, type: "borrow", amount_abra: 0,
      asset_id: assetId, status: "confirmed",
      tx_signature: `BorrowTx${Date.now().toString(36).toUpperCase()}`,
    });
    if (txErr) throw new Error(txErr.message);

    // Update asset status → collateralized
    await supabase.from("assets")
      .update({ status: "collateralized", updated_at: new Date().toISOString() })
      .eq("id", assetId);

    // Upsert position with borrow info
    await supabase.from("positions").upsert({
      wallet, asset_id: assetId, position_type: "borrow",
      ltv_ratio: asset.ltv,
      exposure: borrowAmountUsd,
      updated_at: new Date().toISOString(),
    });

    // Emit event
    await supabase.from("events").insert({
      type: "BORROW_CREATED", asset_id: assetId, wallet,
      payload: { borrowAmountUsd, ltv: asset.ltv, assetName: asset.name },
    });

    return NextResponse.json({ success: true, borrowAmountUsd, maxBorrow });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}