// FILE: app/api/admin/reject/[assetId]/route.ts
// Admin rejects asset — marks it rejected, notifies owner, records reason.
// Asset stays off Markets. $ABRA is NOT refunded (spent on verification work).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest, { params }: { params: { assetId: string } }) {
  if (req.headers.get("x-admin-secret") !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error:"Unauthorized" }, { status: 401 });
  }

  const { assetId } = params;
  const { reason, reviewerWallet } = await req.json().catch(()=>({}));
  if (!reason) return NextResponse.json({ error:"reason required" }, { status: 400 });

  const { data: asset } = await supabase.from("assets").select("*").eq("id",assetId).single();
  if (!asset) return NextResponse.json({ error:"Asset not found" }, { status: 404 });

  // Mark asset rejected (closed lifecycle)
  await supabase.from("assets")
    .update({ status:"closed", updated_at: new Date().toISOString() })
    .eq("id", assetId);

  // Record rejection event
  await supabase.from("events").insert({
    type:"ADMIN_REJECTED", asset_id:assetId, wallet:reviewerWallet??"admin",
    payload:{ reason, reviewer:reviewerWallet, rejected_at: new Date().toISOString() },
  });

  return NextResponse.json({ success:true, assetId, reason, status:"closed" });
}