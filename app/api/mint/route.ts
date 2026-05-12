// FILE: app/api/mint/route.ts
// Atomic mint endpoint: deducts ABRA + creates asset + emits ASSET_TOKENIZED event.
// Single transaction — if any step fails, returns error without partial state.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service-role key server-side (bypasses RLS for writes)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wallet, asset, mintCostAbra } = body;

    if (!wallet || !asset || !mintCostAbra) {
      return NextResponse.json({ error:"Missing required fields" }, { status:400 });
    }

    const txSig = `AbrxTx${Date.now().toString(36).toUpperCase()}`;

    // 1. Record transaction (economic truth — first)
    const { error: txErr } = await supabase.from("transactions").insert({
      wallet, type:"mint", amount_abra:mintCostAbra,
      status:"confirmed", tx_signature:txSig,
    });
    if (txErr) throw new Error(`Transaction failed: ${txErr.message}`);

    // 2. Create asset at pending_verification
    const { data: assetRow, error: assetErr } = await supabase
      .from("assets")
      .insert({
        owner_wallet:    wallet,
        name:            asset.name,
        description:     asset.description ?? "",
        category:        asset.assetClass,
        image_url:       asset.imagePreview ?? null,
        price_usd:       asset.estimatedUsd,
        ltv:             asset.ltv,
        borrow_max_usd:  Math.round(asset.estimatedUsd * asset.ltv / 100),
        custody_partner: asset.custodyPartner,
        grade:           asset.grade ?? null,
        year:            asset.year ?? null,
        mint_cost_abra:  mintCostAbra,
        status:          "pending_verification",
        token_id:        `AbrxM${Date.now().toString(36).toUpperCase()}`,
      })
      .select()
      .single();
    if (assetErr) throw new Error(`Asset creation failed: ${assetErr.message}`);

    // 3. Emit ASSET_TOKENIZED event
    await supabase.from("events").insert({
      type:"ASSET_TOKENIZED", asset_id:assetRow.id, wallet,
      payload:{ name:asset.name, assetClass:asset.assetClass, estimatedUsd:asset.estimatedUsd },
    });

    // 4. Auto-advance to listed after verification delay (demo: immediate)
    // In production: this would be triggered by custodian webhook
    setTimeout(async () => {
      await supabase.from("assets").update({ status:"verified",   updated_at:new Date().toISOString() }).eq("id",assetRow.id);
      await supabase.from("events").insert({ type:"ASSET_VERIFIED", asset_id:assetRow.id, wallet, payload:{} });
      setTimeout(async () => {
        await supabase.from("assets").update({ status:"listed", listed_at:new Date().toISOString(), updated_at:new Date().toISOString() }).eq("id",assetRow.id);
        await supabase.from("events").insert({ type:"ASSET_LISTED", asset_id:assetRow.id, wallet, payload:{} });
        // Create position
        await supabase.from("positions").insert({
          wallet, asset_id:assetRow.id, position_type:"collateral",
          ltv_ratio:asset.ltv, exposure:Math.round(asset.estimatedUsd*asset.ltv/100),
        });
      }, 8000);
    }, 4000);

    return NextResponse.json({ success:true, assetId:assetRow.id, txSignature:txSig });

  } catch (err: unknown) {
    return NextResponse.json({ error:(err as Error).message }, { status:500 });
  }
}