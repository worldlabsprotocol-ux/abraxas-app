// FILE: app/api/assets/inquire/route.ts
// Closed-loop acquisition interest — captured on Abraxas, routed to active partners.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      asset_id?: string;
      asset_name?: string;
      package_interest?: string;
      email?: string;
      wallet?: string | null;
      message?: string | null;
    };

    const assetId = body.asset_id?.trim();
    const email = body.email?.trim();

    if (!assetId) {
      return NextResponse.json({ error: "asset_id required" }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const pkg = body.package_interest?.trim() || "general";
    const walletNote = body.wallet?.trim() ? ` · wallet ${body.wallet.trim()}` : "";
    const messageNote = body.message?.trim() ? body.message.trim() : null;

    const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

    if (!SB_URL || !SB_KEY) {
      return NextResponse.json({
        ok: true,
        local: true,
        message: "Inquiry recorded (local mode — configure Supabase for persistence).",
      });
    }

    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    const { error } = await sb.from("investment_interest").insert({
      asset_id: assetId,
      asset_name: body.asset_name?.trim() ?? assetId,
      investment_option: `${pkg}${walletNote}`,
      email,
      amount_interest: messageNote,
      source: "abraxas_acquire",
    });

    if (error) {
      console.error("[assets/inquire]", error.message);
      return NextResponse.json({ error: "Could not save inquiry" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("[assets/inquire]", e);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
