// FILE: app/api/events/route.ts
// GET recent protocol events for activity feed.
// ?limit=20&asset_id=xxx&wallet=xxx&type=ASSET_LISTED

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit    = parseInt(searchParams.get("limit") ?? "20");
  const assetId  = searchParams.get("asset_id");
  const wallet   = searchParams.get("wallet");
  const type     = searchParams.get("type");

  let query = supabase
    .from("events")
    .select(`*, assets(name, category, image_url, price_usd)`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (assetId) query = query.eq("asset_id", assetId);
  if (wallet)  query = query.eq("wallet", wallet);
  if (type)    query = query.eq("type", type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}