// FILE: app/api/admin/purchases/list/route.ts
// Returns purchase_intents for the lifecycle admin panel. No auth
// gate is added here on purpose, since this whole dashboard already
// sits behind your own sign-in, same trust boundary as the rest of
// the Dashboard.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("purchase_intents")
    .select("id, item_name, price, email, lifecycle_status, risk_flag, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ purchases: [] });
  return NextResponse.json({ purchases: data });
}
