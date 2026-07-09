// FILE: app/api/cielo/receipt/route.ts
// Phase 6: public on-chain receipt for captured Cielo bookings.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildBookingLifecycle, sanitizeStayForGuest } from "@/lib/cielo/bookingStatus";
import { estimateUsdc } from "@/lib/cielo/bookingValidation";
import { getCieloTreasuryLabel } from "@/lib/cielo/treasury";
import { getPublicSuiConfig, suiExplorerTxUrl } from "@/lib/sui/network";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function GET(req: NextRequest) {
  const bookingId = req.nextUrl.searchParams.get("booking_id")?.trim();
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

  const paid = Boolean(stay.payment_verified_at) || stay.status === "captured";
  if (!paid || !stay.payment_tx_digest) {
    return NextResponse.json({
      error: "Receipt available after payment is captured on Sui",
      status: stay.status,
      pay_url: `/cielo/pay?booking_id=${encodeURIComponent(bookingId)}`,
    }, { status: 404 });
  }

  const amount = stay.paid_amount_usdc ?? stay.est_usdc ?? estimateUsdc(stay.check_in, stay.check_out);
  const lifecycle = buildBookingLifecycle(bookingId, stay.status, true);
  const sui = getPublicSuiConfig();

  return NextResponse.json({
    ok: true,
    phase: 6,
    sui,
    receipt: {
      booking_id: bookingId,
      property: stay.property ?? "Cielo Sunrise · AAS-1",
      guest_name: stay.guest_name,
      check_in: stay.check_in,
      check_out: stay.check_out,
      nights: stay.nights,
      amount_usdc: amount,
      asset: "USDC",
      network: sui.network,
      treasury_label: getCieloTreasuryLabel(),
      treasury_address: stay.treasury_address ?? null,
      payment_tx_digest: stay.payment_tx_digest,
      payment_verified_at: stay.payment_verified_at,
      explorer_url: suiExplorerTxUrl(stay.payment_tx_digest),
      calendar: "abraxas_protocol",
      attestation: `CIELO:${bookingId}`,
    },
    booking: sanitizeStayForGuest(stay),
    lifecycle,
  });
}
