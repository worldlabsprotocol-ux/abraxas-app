// FILE: app/api/cielo/payment/verify/route.ts
// Phase 2: verify on-chain USDC payment and capture booking.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCieloPayment } from "@/lib/cielo/paymentVerify";
import { confirmBookingHold } from "@/lib/cielo/calendar";
import { getCieloTreasuryAddress } from "@/lib/cielo/treasury";
import { estimateUsdc } from "@/lib/cielo/bookingValidation";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const bookingId = String(body.booking_id ?? "");
  const txDigest = String(body.tx_digest ?? "").trim();

  if (!bookingId || !txDigest) {
    return NextResponse.json({ error: "booking_id and tx_digest required" }, { status: 400 });
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

  if (stay.payment_tx_digest && stay.status === "captured") {
    return NextResponse.json({
      ok: true,
      already_captured: true,
      booking_id: bookingId,
      tx_digest: stay.payment_tx_digest,
    });
  }

  const expected = stay.est_usdc ?? estimateUsdc(stay.check_in, stay.check_out);
  const verification = await verifyCieloPayment(
    txDigest,
    expected,
    stay.sui_address ?? stay.wallet,
  );

  if (!verification.ok) {
    return NextResponse.json({
      ok: false,
      error: verification.error ?? "Payment verification failed",
      verification,
    }, { status: 400 });
  }

  const treasury = getCieloTreasuryAddress();
  await sb.from("stay_requests").update({
    payment_tx_digest: txDigest,
    payment_verified_at: new Date().toISOString(),
    treasury_address: treasury,
    paid_amount_usdc: verification.amount_human,
    status: "captured",
  }).eq("booking_id", bookingId);

  await confirmBookingHold(bookingId);

  return NextResponse.json({
    ok: true,
    booking_id: bookingId,
    status: "captured",
    verification,
  });
}
