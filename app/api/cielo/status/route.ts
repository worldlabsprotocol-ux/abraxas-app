// FILE: app/api/cielo/status/route.ts
// Phase 5: guest booking lookup (booking_id + email).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildBookingLifecycle, sanitizeStayForGuest } from "@/lib/cielo/bookingStatus";
import { estimateUsdc } from "@/lib/cielo/bookingValidation";
import { getPublicSuiConfig } from "@/lib/sui/network";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const bookingId = String(body.booking_id ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();

  if (!bookingId || !email) {
    return NextResponse.json({ error: "booking_id and email required" }, { status: 400 });
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

  if (String(stay.email ?? "").trim().toLowerCase() !== email) {
    return NextResponse.json({ error: "Email does not match this booking" }, { status: 403 });
  }

  const paid = Boolean(stay.payment_verified_at) || stay.status === "captured";
  const lifecycle = buildBookingLifecycle(bookingId, stay.status, paid);
  const amount = stay.est_usdc ?? estimateUsdc(stay.check_in, stay.check_out);

  return NextResponse.json({
    ok: true,
    sui: getPublicSuiConfig(),
    booking: sanitizeStayForGuest(stay),
    amount_usdc: amount,
    lifecycle,
  });
}

/** Lightweight public check — no PII, for status page prefetch. */
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
    .select("booking_id, status, check_in, check_out, payment_verified_at")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (!stay) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const paid = Boolean(stay.payment_verified_at) || stay.status === "captured";
  return NextResponse.json({
    ok: true,
    exists: true,
    booking_id: stay.booking_id,
    status: stay.status,
    paid,
    requires_email: true,
  });
}
