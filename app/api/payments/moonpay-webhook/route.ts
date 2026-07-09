import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMoonPayTransaction, isMoonPayConfigured } from "@/lib/payments/moonpay";
import { findInboundTreasuryPayment } from "@/lib/cielo/paymentEvents";
import { verifyCieloPayment } from "@/lib/cielo/paymentVerify";
import { captureBookingPayment } from "@/lib/cielo/captureBookingPayment";
import { estimateUsdc } from "@/lib/cielo/bookingValidation";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/moonpay-webhook
 * MoonPay transaction webhook scaffold — reconcile booking when txn completes.
 */
export async function POST(req: NextRequest) {
  if (!isMoonPayConfigured()) {
    return NextResponse.json({ ok: false, error: "MoonPay not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const txnId = String(body.transactionId ?? body.id ?? "");
  const bookingId = String(body.externalCustomerId ?? body.booking_id ?? body.metadata?.booking_id ?? "");

  if (!txnId) {
    return NextResponse.json({ ok: false, error: "transaction id required" }, { status: 400 });
  }

  const txn = await getMoonPayTransaction(txnId);
  if (!txn || txn.status !== "complete") {
    return NextResponse.json({ ok: true, pending: true, status: txn?.status ?? "unknown" });
  }

  if (!bookingId || !SB_URL || !SB_KEY) {
    return NextResponse.json({ ok: true, txn_complete: true, booking_reconciled: false });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data: stay } = await sb
    .from("stay_requests")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (!stay || stay.status === "captured") {
    return NextResponse.json({ ok: true, already_captured: true });
  }

  const expected = stay.est_usdc ?? estimateUsdc(stay.check_in, stay.check_out);
  const sender = stay.sui_address ?? stay.wallet ?? null;
  const match = await findInboundTreasuryPayment(expected, sender);

  if (!match) {
    return NextResponse.json({ ok: true, txn_complete: true, on_chain_pending: true });
  }

  const verification = await verifyCieloPayment(match.tx_digest, expected, sender);
  if (!verification.ok) {
    return NextResponse.json({ ok: false, error: verification.error }, { status: 400 });
  }

  await captureBookingPayment(bookingId, verification);

  return NextResponse.json({ ok: true, captured: true, booking_id: bookingId });
}
