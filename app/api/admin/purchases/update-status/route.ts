// FILE: app/api/admin/purchases/update-status/route.ts
// Moves a purchase through the lifecycle: authorized -> captured ->
// settled, or marks it disputed. This is the operational side of the
// state machine, without this, the status column is just data nobody
// acts on.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_STATUSES = ["authorized", "captured", "disputed", "settled", "refunded"];

export async function POST(req: NextRequest) {
  const body = await req.json() as { id?: string; lifecycle_status?: string; dispute_reason?: string };
  if (!body.id || !body.lifecycle_status || !VALID_STATUSES.includes(body.lifecycle_status)) {
    return NextResponse.json({ error: "id and a valid lifecycle_status required" }, { status: 400 });
  }

  const update: Record<string, unknown> = { lifecycle_status: body.lifecycle_status };
  if (body.lifecycle_status === "captured") update.captured_at = new Date().toISOString();
  if (body.lifecycle_status === "settled") update.settled_at = new Date().toISOString();
  if (body.lifecycle_status === "disputed" && body.dispute_reason) update.dispute_reason = body.dispute_reason;

  const { error } = await supabase.from("purchase_intents").update(update).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: true });
}
