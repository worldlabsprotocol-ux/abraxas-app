// FILE: lib/cielo/captureBookingPayment.ts
// Shared booking capture after on-chain payment verification.

import { createClient } from "@supabase/supabase-js";
import type { PaymentVerification } from "@/lib/cielo/paymentVerify";
import { confirmBookingHold } from "@/lib/cielo/calendar";
import { getCieloTreasuryAddress } from "@/lib/cielo/treasury";
import { emailPaymentCaptured } from "@/lib/cielo/notifications";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function captureBookingPayment(
  bookingId: string,
  verification: PaymentVerification,
) {
  if (!SB_URL || !SB_KEY) {
    throw new Error("Database not configured");
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data: stay } = await sb
    .from("stay_requests")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (!stay) throw new Error("Booking not found");

  if (stay.payment_tx_digest && stay.status === "captured") {
    return { already_captured: true as const, stay, verification };
  }

  const treasury = getCieloTreasuryAddress();
  const updatePayload: Record<string, unknown> = {
    payment_tx_digest: verification.tx_digest,
    payment_verified_at: new Date().toISOString(),
    treasury_address: treasury,
    paid_amount_usdc: verification.amount_human,
    status: "captured",
  };

  await sb.from("stay_requests").update(updatePayload).eq("booking_id", bookingId);
  await confirmBookingHold(bookingId);

  if (stay.email) {
    await emailPaymentCaptured({
      booking_id: bookingId,
      guest_name: stay.guest_name,
      email: stay.email,
      check_in: stay.check_in,
      check_out: stay.check_out,
      est_usdc: stay.est_usdc,
      payment_tx_digest: verification.tx_digest,
      paid_amount_usdc: verification.amount_human,
    });
  }

  return { already_captured: false as const, stay, verification };
}
