// FILE: app/api/admin/approve/[assetId]/route.ts
// Admin approves asset — advances pending_verification → verified → listed.
// Records reviewer, approval timestamp, notes.
// Protected by ADMIN_SECRET. Triggers real-time Markets update via DB change.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processEvent } from "@/lib/assetStateMachine";
import { recordVaultRouting } from "@/lib/abraVaultRouter";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest, { params }: { params: { assetId: string } }) {
  if (req.headers.get("x-admin-secret") !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error:"Unauthorized" }, { status: 401 });
  }

  const { assetId } = params;
  const body = await req.json().catch(()=>({}));
  const { reviewerWallet, notes } = body;

  // 1. Fetch asset to get owner + class
  const { data: asset, error: assetErr } = await supabase
    .from("assets").select("*").eq("id", assetId).single();
  if (assetErr || !asset) return NextResponse.json({ error:"Asset not found" }, { status: 404 });
  if (asset.status !== "pending_verification") {
    return NextResponse.json({ error:`Asset is '${asset.status}', not pending` }, { status: 400 });
  }

  // 2. Record approval decision
  await supabase.from("events").insert({
    type:     "ADMIN_APPROVED",
    asset_id: assetId,
    wallet:   reviewerWallet ?? "admin",
    payload:  { notes, reviewer: reviewerWallet, approved_at: new Date().toISOString() },
  });

  // 3. Advance state machine: verified → listed (two transitions, auto-cascade)
  await processEvent("ASSET_VERIFIED", assetId, asset.owner_wallet);

  // 4. Record vault routing for the mint fee
  const mintEvent = await supabase
    .from("events").select("payload")
    .eq("asset_id", assetId).eq("type","ASSET_TOKENIZED").single();

  if (mintEvent.data) {
    await recordVaultRouting({
      wallet:     asset.owner_wallet,
      assetId,
      assetClass: asset.category,
      totalAbra:  asset.mint_cost_abra ?? 0,
      txSignature:`AdminApprove${assetId.slice(0,8)}`,
    });
  }

  return NextResponse.json({
    success:    true,
    assetId,
    newStatus:  "listed",
    assetName:  asset.name,
    approvedAt: new Date().toISOString(),
  });
}