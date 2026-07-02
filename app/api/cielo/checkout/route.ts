// FILE: app/api/cielo/checkout/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { estimateUsdc } from "@/lib/cielo/bookingValidation";
import { getCieloTreasuryAddress, getCieloTreasuryLabel, getUsdcCoinType } from "@/lib/cielo/treasury";
import { getPublicSuiConfig } from "@/lib/sui/network";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

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
  const treasuryAddress = getCieloTreasuryAddress();
  const treasuryLabel = getCieloTreasuryLabel();
  const usdcType = getUsdcCoinType();
  const sui = getPublicSuiConfig();

  if (suiAddress) {
    await sb.from("stay_requests").update({
      sui_address: suiAddress,
      wallet: suiAddress,
      status: stay.status === "pending" ? "authorized" : stay.status,
    }).eq("booking_id", bookingId);
  }

  const payUrl = `/cielo/pay?booking_id=${encodeURIComponent(bookingId)}`;

  return NextResponse.json({
    ok: true,
    phase: 4,
    booking_id: bookingId,
    status: stay.status,
    pay_url: payUrl,
    sui,
    payment: {
      chain: "sui",
      network: sui.network,
      asset: usdcType ? "USDC" : "SUI (devnet test until USDC configured)",
      amount_usdc: amount,
      treasury_address: treasuryAddress,
      treasury_label: treasuryLabel,
      sui_usdc_coin_type: usdcType,
      memo,
      instructions: [
        `Open ${payUrl} to complete payment`,
        treasuryAddress
          ? `Send ${amount} USDC to ${treasuryAddress}`
          : `Configure SUI_TREASURY_ADDRESS on server — label ${treasuryLabel}`,
        `One-click pay from zkLogin wallet on ${sui.network}`,
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
