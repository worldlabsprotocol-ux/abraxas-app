// FILE: app/api/cielo/booking/route.ts
// GET booking status for guest payment page.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCieloTreasuryAddress, getCieloTreasuryLabel, getUsdcCoinType } from "@/lib/cielo/treasury";
import { estimateUsdc } from "@/lib/cielo/bookingValidation";
import { getPublicSuiConfig } from "@/lib/sui/network";

export async function GET(req: NextRequest) {
  const bookingId = req.nextUrl.searchParams.get("booking_id") ?? req.nextUrl.searchParams.get("id");
  if (!bookingId) {
    return NextResponse.json({ error: "booking_id required" }, { status: 400 });
  }

  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
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
  const treasuryAddress = getCieloTreasuryAddress();
  const payable = ["confirmed", "authorized", "pending"].includes(stay.status);
  const sui = getPublicSuiConfig();

  return NextResponse.json({
    ok: true,
    sui,
    booking: {
      booking_id: stay.booking_id,
      status: stay.status,
      guest_name: stay.guest_name,
      check_in: stay.check_in,
      check_out: stay.check_out,
      nights: stay.nights,
      est_usdc: amount,
      sui_address: stay.sui_address ?? stay.wallet,
      payment_tx_digest: stay.payment_tx_digest ?? null,
      payment_verified_at: stay.payment_verified_at ?? null,
      paid: Boolean(stay.payment_verified_at) || stay.status === "captured",
    },
    payment: {
      chain: "sui",
      network: sui.network,
      asset: getUsdcCoinType() ? "USDC" : "SUI (devnet test)",
      amount_usdc: amount,
      treasury_address: treasuryAddress,
      treasury_label: getCieloTreasuryLabel(),
      usdc_coin_type: getUsdcCoinType(),
      memo: `CIELO:${stay.booking_id}`,
      payable,
    },
  });
}
