// FILE: app/api/cielo/checkout/route.ts
// Phase 2: payment instructions for a confirmed Abraxas booking.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { estimateUsdc } from "@/lib/cielo/bookingValidation";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const TREASURY = process.env.NEXT_PUBLIC_CIRCUIT_WALLET ?? "circuit.skr";
const SUI_USDC_TYPE = process.env.SUI_USDC_COIN_TYPE ?? "0x2::sui::SUI"; // replace with mainnet USDC type in prod

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const bookingId = String(body.booking_id ?? "");
  const suiAddress = String(body.sui_address ?? body.wallet ?? "").trim();

  if (!bookingId) {
    return NextResponse.json({ error: "booking_id required" }, { status: 400 });
  }

  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data: stay } = await sb
    .from("stay_requests")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (!stay) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const amount = stay.est_usdc ?? estimateUsdc(stay.check_in, stay.check_out);
  const memo = `CIELO:${bookingId}`;

  if (suiAddress) {
    await sb.from("stay_requests").update({
      sui_address: suiAddress,
      wallet: suiAddress,
      status: stay.status === "pending" ? "authorized" : stay.status,
    }).eq("booking_id", bookingId);
  }

  return NextResponse.json({
    ok: true,
    phase: 2,
    booking_id: bookingId,
    status: stay.status,
    payment: {
      chain: "sui",
      asset: "USDC",
      amount_usdc: amount,
      treasury_label: TREASURY,
      sui_usdc_coin_type: SUI_USDC_TYPE,
      memo,
      instructions: [
        `Send ${amount} USDC on Sui to treasury ${TREASURY}`,
        `Include memo ${memo} in transaction notes if your wallet supports it`,
        "Team verifies on-chain receipt, then confirms your stay",
      ],
    },
    stay: {
      check_in: stay.check_in,
      check_out: stay.check_out,
      nights: stay.nights,
      guest_name: stay.guest_name,
    },
  });
}
