// FILE: app/api/bookings/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { getCieloAvailability } from "@/lib/cielo/availability";
import { holdDatesForBooking } from "@/lib/cielo/calendar";
import { rangesOverlap, eachNight, estimateUsdc } from "@/lib/cielo/bookingValidation";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const TREASURY = process.env.NEXT_PUBLIC_CIRCUIT_WALLET ?? "circuit.skr";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const checkIn = String(body.check_in ?? "");
  const checkOut = String(body.check_out ?? "");
  const guestName = String(body.guest_name ?? "").trim();
  const email = String(body.email ?? "").trim();

  if (!guestName || !email || !checkIn || !checkOut) {
    return NextResponse.json({ error: "Name, email, check_in, and check_out are required" }, { status: 400 });
  }

  const nights = eachNight(checkIn, checkOut);
  if (nights.length === 0) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const availability = await getCieloAvailability();
  if (rangesOverlap(checkIn, checkOut, availability.blocked)) {
    return NextResponse.json({
      error: "Selected dates are blocked on the Abraxas Protocol Calendar",
    }, { status: 409 });
  }

  const booking_id = `BKG-${randomUUID().slice(0, 8).toUpperCase()}`;
  const estUsdc = body.est_usdc ?? estimateUsdc(checkIn, checkOut);
  const row = {
    ...body,
    booking_id,
    guest_name: guestName,
    email,
    check_in: checkIn,
    check_out: checkOut,
    nights: nights.length,
    est_usdc: estUsdc,
    status: "pending",
    payment_chain: body.payment_chain ?? "sui",
    payment_asset: body.payment_asset ?? "USDC",
  };

  if (SB_URL && SB_KEY) {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    try {
      await sb.from("stay_requests").insert({
        booking_id,
        property: body.property ?? "Cielo Sunrise · AAS-1",
        check_in: checkIn,
        check_out: checkOut,
        guests: body.guests ?? null,
        guest_name: guestName,
        email,
        wallet: body.sui_address ?? body.wallet ?? null,
        sui_address: body.sui_address ?? body.wallet ?? null,
        notes: body.notes ?? null,
        nights: nights.length,
        est_usdc: estUsdc,
        status: "pending",
        payment_chain: body.payment_chain ?? "sui",
        payment_asset: body.payment_asset ?? "USDC",
      });
      await holdDatesForBooking(booking_id, checkIn, checkOut);
    } catch {
      /* non-blocking if table missing in dev */
    }
  }

  const key = process.env.RESEND_API_KEY;
  const admin = process.env.ADMIN_EMAIL;
  if (key && admin) {
    const html = `<div style="font-family:monospace;background:#040608;color:#F8FAFC;padding:24px;border-radius:8px">
      <div style="color:#F59E0B;font-size:11px;font-weight:700;letter-spacing:3px;margin-bottom:8px">CIELO SUNRISE — ABRAXAS BOOKING</div>
      <p>Guest: ${guestName} · ${email}</p>
      <p>Dates: ${checkIn} → ${checkOut} (${nights.length} nights)</p>
      <p>Guests: ${body.guests ?? "?"}</p>
      <p>Sui wallet: ${body.sui_address ?? body.wallet ?? "not provided"}</p>
      <p>Payment: ${row.payment_asset} on ${row.payment_chain} → ${TREASURY}</p>
      <p>Estimate: ~${estUsdc} USDC</p>
      <p>Notes: ${body.notes ?? "none"}</p>
      <p>Booking ID: ${booking_id}</p>
      <p style="color:#10B981;margin-top:12px">Action: confirm dates, block on Airbnb if needed, send Sui USDC instructions.</p>
    </div>`;

    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Abraxas Protocol <onboarding@resend.dev>",
        to: [admin],
        subject: `Cielo booking · ${guestName} · ${checkIn}–${checkOut} · ~${estUsdc} USDC`,
        html,
      }),
    }).catch(() => null);

    if (email) {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Cielo Sunrise via Abraxas <onboarding@resend.dev>",
          to: [email],
          subject: `Booking request received — ${checkIn} to ${checkOut}`,
          html: `<div style="font-family:system-ui,sans-serif;background:#040608;color:#F8FAFC;padding:24px;border-radius:8px;max-width:480px">
            <div style="color:#F59E0B;font-size:11px;font-weight:700;letter-spacing:3px;margin-bottom:12px">CIELO SUNRISE · ABRAXAS</div>
            <div style="font-size:22px;font-weight:700;margin-bottom:16px">Your booking request is in.</div>
            <p style="color:#9CA3AF;font-size:13px;line-height:1.7">Your dates are reserved on the <strong>Abraxas Protocol Calendar</strong>. Within 24 hours we confirm and send <strong style="color:#F59E0B">USDC on Sui</strong> payment instructions to <strong>${TREASURY}</strong>.</p>
            <div style="background:#0D1117;border:1px solid #1C2333;border-radius:6px;padding:16px;margin:16px 0">
              <p style="margin:0 0 6px;color:#6B7280;font-size:11px">YOUR STAY</p>
              <p style="margin:0 0 4px">Check-in: ${checkIn}</p>
              <p style="margin:0 0 4px">Check-out: ${checkOut}</p>
              <p style="margin:0 0 4px">Guests: ${body.guests ?? "?"}</p>
              <p style="margin:0;color:#F59E0B;font-weight:700">Est. ${estUsdc} USDC on Sui</p>
            </div>
            <p style="color:#4B5563;font-size:11px">Booking ID: ${booking_id}</p>
            <p style="margin-top:12px"><a href="${process.env.ABRAXAS_ISSUER_URL ?? "https://abraxas-app.vercel.app"}/cielo/status?booking_id=${encodeURIComponent(booking_id)}" style="color:#10B981">Track your booking →</a></p>
          </div>`,
        }),
      }).catch(() => null);
    }
  }

  return NextResponse.json({ ok: true, booking_id, treasury: TREASURY, payment_chain: "sui" });
}
