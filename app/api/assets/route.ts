// FILE: app/api/assets/route.ts
// GET assets filtered by status. Used by Markets, Vaults, Studio queue.
// ?status=listed | pending_verification | verified | all
// ?wallet=xxx  → filter by owner

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const wallet = searchParams.get("wallet");
  const limit  = parseInt(searchParams.get("limit") ?? "100");

  let query = supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") query = query.eq("status", status);
  if (wallet) query = query.eq("owner_wallet", wallet);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assets: data ?? [] });
}