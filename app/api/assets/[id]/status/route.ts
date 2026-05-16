// FILE: app/api/assets/[id]/status/route.ts
// Update asset verification status. Admin only (service role).
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient }         from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await req.json().catch(()=>null);
  if (!body?.status) return NextResponse.json({error:"status required"},{status:400});

  const db = createAdminClient();
  if (!db) return NextResponse.json({error:"Supabase not configured"},{status:503});

  // Fetch current asset to record transition
  const { data: current } = await db.from("assets").select("status").eq("id",id).single();

  const { data, error } = await db
    .from("assets")
    .update({ status: body.status })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({error:error.message},{status:500});

  // Log the state transition
  await db.from("verification_reviews").insert({
    asset_id:    id,
    reviewer:    body.reviewer ?? "ADMIN",
    action:      body.action   ?? "status_change",
    from_status: current?.status ?? null,
    to_status:   body.status,
    note:        body.note ?? null,
  });

  await db.from("asset_events").insert({
    asset_id:   id,
    event_type: "STATUS_CHANGE",
    actor:      body.reviewer ?? "ADMIN",
    payload:    { from: current?.status, to: body.status, note: body.note },
  });

  // Notify the asset owner
  if (data?.owner_wallet) {
    await db.from("notifications").insert({
      wallet:   data.owner_wallet,
      asset_id: id,
      type:     "status_change",
      message:  `Your asset "${data.name}" status has been updated to: ${body.status.replace(/_/g," ")}`,
    });
  }

  return NextResponse.json({success:true, asset:data});
}