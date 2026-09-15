// FILE: app/api/admin/purchases/list/route.ts
// Returns purchase_intents for the lifecycle admin panel.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("purchase_intents")
    .select("id, item_name, price, email, lifecycle_status, risk_flag, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ purchases: [] });
  return NextResponse.json({ purchases: data });
}
