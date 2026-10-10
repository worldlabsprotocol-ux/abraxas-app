// FILE: app/api/positions/route.ts
// GET collateral positions for a wallet. Powers the Capital/Vaults tab.
// ?wallet=xxx

import { NextRequest, NextResponse } from "next/server";
import { supabaseForRoute } from "@/lib/supabase/routeAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = supabaseForRoute();
  const wallet = new URL(req.url).searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

  const { data, error } = await supabase
    .from("positions")
    .select(`*, assets(name, category, image_url, price_usd, ltv, custody_partner, status)`)
    .eq("wallet", wallet)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ positions: data ?? [] });
}