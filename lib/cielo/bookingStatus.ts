// FILE: lib/cielo/bookingStatus.ts
// Guest-facing booking lifecycle for Cielo revenue loop.

export type StayStatus =
  | "pending"
  | "confirmed"
  | "authorized"
  | "captured"
  | "cancelled"
  | "declined";

export interface StatusStep {
  id: string;
  label: string;
  detail: string;
  complete: boolean;
  current: boolean;
}

export interface BookingLifecycle {
  status: StayStatus;
  steps: StatusStep[];
  payable: boolean;
  paid: boolean;
  pay_url: string;
  status_url: string;
  receipt_url: string | null;
}

export function buildBookingLifecycle(
  bookingId: string,
  status: string,
  paid: boolean,
): BookingLifecycle {
  const s = status as StayStatus;
  const payUrl = `/cielo/pay?booking_id=${encodeURIComponent(bookingId)}`;
  const statusUrl = `/cielo/status?booking_id=${encodeURIComponent(bookingId)}`;
  const receiptUrl = paid || s === "captured"
    ? `/cielo/receipt?booking_id=${encodeURIComponent(bookingId)}`
    : null;

  const submitted = true;
  const confirmed = ["confirmed", "authorized", "captured"].includes(s);
  const captured = s === "captured" || paid;
  const cancelled = s === "cancelled" || s === "declined";

  const steps: StatusStep[] = [
    {
      id: "submitted",
      label: "Request submitted",
      detail: "Dates held on Abraxas Protocol Calendar",
      complete: submitted,
      current: s === "pending",
    },
    {
      id: "confirmed",
      label: cancelled ? "Booking closed" : "Operator confirmed",
      detail: cancelled
        ? `Status: ${s}`
        : "Ready for USDC payment on Sui",
      complete: confirmed && !cancelled,
      current: !cancelled && (s === "confirmed" || s === "authorized"),
    },
    {
      id: "paid",
      label: "Payment captured",
      detail: "On-chain USDC verified · stay confirmed",
      complete: captured,
      current: confirmed && !captured && !cancelled,
    },
  ];

  return {
    status: s,
    steps,
    payable: ["confirmed", "authorized", "pending"].includes(s) && !captured && !cancelled,
    paid: captured,
    pay_url: payUrl,
    status_url: statusUrl,
    receipt_url: receiptUrl,
  };
}

export function sanitizeStayForGuest(stay: Record<string, unknown>) {
  return {
    booking_id: stay.booking_id,
    property: stay.property,
    guest_name: stay.guest_name,
    check_in: stay.check_in,
    check_out: stay.check_out,
    guests: stay.guests,
    nights: stay.nights,
    est_usdc: stay.est_usdc,
    status: stay.status,
    payment_tx_digest: stay.payment_tx_digest ?? null,
    payment_verified_at: stay.payment_verified_at ?? null,
    paid_amount_usdc: stay.paid_amount_usdc ?? null,
    treasury_address: stay.treasury_address ?? null,
    created_at: stay.created_at,
  };
}
