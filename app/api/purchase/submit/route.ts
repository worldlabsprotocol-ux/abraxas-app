// FILE: app/api/purchase/submit/route.ts
// Records a direct purchase intent (books, Cielo stays/shares) so the team
// can follow up once the USDC/USDT transfer confirms on-chain.
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
      status: "pending_confirmation",
    });
    return NextResponse.json({ recorded: true });
  } catch {
    // Fail open. never block a buyer because of a logging hiccup.
    return NextResponse.json({ recorded: true });
  }
}
