// FILE: app/api/assets/inquire/route.ts
// Asset acquisition inquiry — persists + optional admin notify.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    asset_id?: string;
    asset_name?: string;
    package_interest?: string;
    email?: string;
    wallet?: string;
    message?: string;
  };

  const email = body.email?.trim();
  const assetId = body.asset_id?.trim();
  const assetName = body.asset_name?.trim();

  if (!email?.includes("@") || !assetId || !assetName) {
    return NextResponse.json({ error: "asset_id, asset_name, and valid email required" }, { status: 400 });
  }

  const record = {
    asset_id: assetId,
    asset_name: assetName,
    package_interest: body.package_interest ?? null,
    email,
    wallet: body.wallet ?? null,
    message: body.message?.trim() ?? null,
    status: "submitted",
  };

  if (SB_URL && SB_KEY) {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    const { error } = await sb.from("asset_inquiries").insert(record);
    if (error) {
      console.error("asset_inquiries insert:", error.message);
      return NextResponse.json({ error: "Could not save inquiry" }, { status: 500 });
    }
  } else {
    console.info("[asset_inquire]", JSON.stringify(record));
  }

  return NextResponse.json({
    ok: true,
    message: "Inquiry received — Abraxas routes qualified buyers to the partner on-protocol.",
  });
}
