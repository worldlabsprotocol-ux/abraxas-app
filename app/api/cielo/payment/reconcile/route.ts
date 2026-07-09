import { NextRequest, NextResponse } from "next/server";
import { verifyCieloPayment } from "@/lib/cielo/paymentVerify";
import { findInboundTreasuryPayment } from "@/lib/cielo/paymentEvents";
import { captureBookingPayment } from "@/lib/cielo/captureBookingPayment";
import { estimateUsdc } from "@/lib/cielo/bookingValidation";
import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const dynamic = "force-dynamic";

/**
 * POST /api/cielo/payment/reconcile
 * Verify payment by tx digest OR scan recent treasury inbound events.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const bookingId = String(body.booking_id ?? "");
  const txDigest = body.tx_digest ? String(body.tx_digest).trim() : undefined;
  const scanEvents = body.scan_events === true;

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

  if (stay.payment_tx_digest && stay.status === "captured") {
    return NextResponse.json({
      ok: true,
      already_captured: true,
      booking_id: bookingId,
      tx_digest: stay.payment_tx_digest,
    });
  }

  const expected = stay.est_usdc ?? estimateUsdc(stay.check_in, stay.check_out);
  const sender = stay.sui_address ?? stay.wallet ?? null;

  let verification;
  if (txDigest) {
    verification = await verifyCieloPayment(txDigest, expected, sender);
  } else if (scanEvents) {
    const match = await findInboundTreasuryPayment(expected, sender);
    if (!match) {
      return NextResponse.json({
        ok: false,
        error: "No matching inbound payment found on treasury yet",
        method: "event_scan",
      }, { status: 404 });
    }
    verification = await verifyCieloPayment(match.tx_digest, expected, sender);
  } else {
    return NextResponse.json({
      error: "Provide tx_digest or set scan_events: true",
    }, { status: 400 });
  }

  if (!verification.ok) {
    return NextResponse.json({
      ok: false,
      error: verification.error ?? "Payment verification failed",
      verification,
    }, { status: 400 });
  }

  const result = await captureBookingPayment(bookingId, verification);

  return NextResponse.json({
    ok: true,
    booking_id: bookingId,
    status: "captured",
    method: txDigest ? "digest" : "event_scan",
    already_captured: result.already_captured,
    verification,
  });
}
