// FILE: app/api/invest/submit/route.ts
// Investor interest submissions for asset deals.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      asset_id?: string;
      asset_name?: string;
      investment_option?: string;
      email?: string;
      amount_interest?: string | null;
    };

    const email = body.email?.trim();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    if (!body.asset_id?.trim()) {
      return NextResponse.json({ error: "Asset ID required" }, { status: 400 });
    }

    const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!SB_URL || !SB_KEY) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    const { error } = await sb.from("investment_interest").insert({
      asset_id: body.asset_id.trim(),
      asset_name: body.asset_name?.trim() ?? body.asset_id,
      investment_option: body.investment_option?.trim() ?? "general",
      email,
      amount_interest: body.amount_interest?.trim() || null,
      source: "investor_portal",
    });

    if (error) {
      console.error("[invest/submit]", error.message);
      return NextResponse.json({ error: "Could not save interest" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("[invest/submit]", e);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
