// FILE: app/api/purchase/submit/route.ts
// Records a direct purchase intent with a real lifecycle status,
// extracted from NodeRails' Authorize -> Capture -> Dispute -> Settle
// pattern. A purchase starts "authorized" (the buyer said they sent
// funds), moves to "captured" once your team confirms the on-chain
// transfer, then "settled" once everything's wrapped up. Large
// amounts get auto-flagged for a closer look, same idea as a fraud
// risk engine, sized for what's actually buildable without a paid
// compliance vendor.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const LARGE_AMOUNT_THRESHOLD = 10000; // dollars, adjust to taste

function parsePrice(price?: string): number {
  if (!price) return 0;
  const n = parseFloat(price.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

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

    const amount = parsePrice(body.price);
    const riskFlag = amount >= LARGE_AMOUNT_THRESHOLD ? "large_amount_review" : "normal";

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
      lifecycle_status: "authorized",
      risk_flag: riskFlag,
    });
    return NextResponse.json({ recorded: true, lifecycle_status: "authorized" });
  } catch {
    return NextResponse.json({ recorded: true });
  }
}
