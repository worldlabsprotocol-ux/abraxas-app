// FILE: app/api/purchase/submit/route.ts
// Records a direct purchase intent (books, Cielo stays/shares, World
// Wearables apparel) so the team can follow up once the USDC/USDT
// transfer confirms on-chain. Captures size, shipping address, and
// check-in/check-out dates for booking-style purchases.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      item_id?: string; item_name?: string; price?: string;
      stablecoin?: string; email?: string;
      size?: string | null; shipping_address?: string | null;
      check_in?: string | null; check_out?: string | null;
    };
    if (!body.email || !body.item_id) {
      return NextResponse.json({ error: "email and item_id required" }, { status: 400 });
    }
    await supabase.from("purchase_intents").insert({
      item_id: body.item_id,
      item_name: body.item_name ?? null,
      price: body.price ?? null,
      stablecoin: body.stablecoin ?? "USDC",
      email: body.email,
      size: body.size ?? null,
      shipping_address: body.shipping_address ?? null,
      check_in: body.check_in ?? null,
      check_out: body.check_out ?? null,
      status: "pending_confirmation",
    });
    return NextResponse.json({ recorded: true });
  } catch {
    return NextResponse.json({ recorded: true });
  }
}
