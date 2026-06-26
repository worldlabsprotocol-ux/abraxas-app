// FILE: app/api/passport/genesis/claim/route.ts
// Assigns the next available Founding Verified seat. Uses a real
// Postgres row lock (select ... for update via a single atomic
// update-and-return) so two people completing verification at the
// same instant can't both get assigned the same seat number.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { walletOrContext, hasSocial, hasIdentity } = await req.json() as {
      walletOrContext?: string; hasSocial?: boolean; hasIdentity?: boolean;
    };

    if (!walletOrContext) {
      return NextResponse.json({ error: "walletOrContext required" }, { status: 400 });
    }
    if (!hasSocial || !hasIdentity) {
      return NextResponse.json(
        { error: "Founding Verified requires both Social Verified and Identity Verified first" },
        { status: 400 }
      );
    }

    // Already claimed, return the existing seat instead of erroring,
    // this call is safe to retry.
    const { data: existing } = await supabase
      .from("genesis_passport_seats")
      .select("seat_number")
      .eq("wallet_or_context", walletOrContext)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ seatNumber: existing.seat_number, alreadyClaimed: true });
    }

    // Atomic increment-and-check via a single round trip, the
    // database-level uniqueness constraint on wallet_or_context is
    // the real backstop against a double-claim race, this RPC just
    // makes the seat-number assignment atomic too.
    const { data, error } = await supabase.rpc("claim_genesis_seat", {
      p_wallet: walletOrContext,
    });

    if (error || !data) {
      return NextResponse.json({ error: "No seats remaining" }, { status: 409 });
    }

    return NextResponse.json({ seatNumber: data, alreadyClaimed: false });
  } catch {
    return NextResponse.json({ error: "Could not process claim" }, { status: 500 });
  }
}
