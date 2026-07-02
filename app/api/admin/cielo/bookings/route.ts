// FILE: app/api/admin/cielo/bookings/route.ts
// Update Cielo booking status + sync Protocol Calendar holds.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { confirmBookingHold, releaseBookingHold } from "@/lib/cielo/calendar";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ADMIN_PIN = process.env.ADMIN_PIN ?? process.env.NEXT_PUBLIC_ADMIN_PIN ?? "abraxas2026";

const VALID = ["pending", "confirmed", "authorized", "captured", "cancelled", "declined"];

export async function GET(req: NextRequest) {
  const pin = req.headers.get("x-admin-pin");
  if (pin !== ADMIN_PIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data } = await sb
    .from("stay_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ bookings: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const pin = req.headers.get("x-admin-pin") ?? body.pin;
  if (pin !== ADMIN_PIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookingId = String(body.booking_id ?? "");
  const status = String(body.status ?? "");
  if (!bookingId || !VALID.includes(status)) {
    return NextResponse.json({ error: "booking_id and valid status required" }, { status: 400 });
  }

  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  await sb.from("stay_requests").update({ status }).eq("booking_id", bookingId);

  if (status === "confirmed" || status === "authorized" || status === "captured") {
    await confirmBookingHold(bookingId);
  }
  if (status === "cancelled" || status === "declined") {
    await releaseBookingHold(bookingId);
  }

  return NextResponse.json({ ok: true, booking_id: bookingId, status });
}
