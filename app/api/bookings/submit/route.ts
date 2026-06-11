// FILE: app/api/bookings/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient }             from "@supabase/supabase-js";
import { randomUUID }               from "crypto";

const SB_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL     ?? "";
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const booking_id = `BKG-${randomUUID().slice(0,8).toUpperCase()}`;

  // Save to Supabase if available
  if (SB_URL && SB_ANON) {
    const sb = createClient(SB_URL, SB_ANON, { auth: { persistSession: false } });
    try { await sb.from("stay_requests").insert({ ...body, booking_id }); } catch { /* non-blocking */ }
  }

  // Email Pablo
  const key = process.env.RESEND_API_KEY;
  const admin = process.env.ADMIN_EMAIL;
  if (key && admin) {
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from:    "Abraxas Protocol <onboarding@resend.dev>",
        to:      [admin],
        subject: `Cielo Sunrise Booking Request — ${body.guest_name} · ${body.check_in} to ${body.check_out} · ~${body.est_usdc} USDC`,
        html: `<div style="font-family:monospace;background:#040608;color:#F8FAFC;padding:24px;border-radius:8px">
          <div style="color:#F59E0B;font-size:11px;font-weight:700;letter-spacing:3px;margin-bottom:8px">CIELO SUNRISE — BOOKING REQUEST</div>
          <p>Guest: ${body.guest_name} · ${body.email}</p>
          <p>Dates: ${body.check_in} → ${body.check_out} (${body.nights} nights)</p>
          <p>Guests: ${body.guests}</p>
          <p>Wallet: ${body.wallet ?? "not provided"}</p>
          <p>Estimate: ~${body.est_usdc} USDC</p>
          <p>Notes: ${body.notes ?? "none"}</p>
          <p>Booking ID: ${booking_id}</p>
        </div>`,
      }),
    }).catch(() => null);

    // Confirmation to guest
    if (body.email) {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from:    "Cielo Sunrise via Abraxas <onboarding@resend.dev>",
          to:      [body.email],
          subject: `Booking request received — ${body.check_in} to ${body.check_out}`,
          html: `<div style="font-family:system-ui,sans-serif;background:#040608;color:#F8FAFC;padding:24px;border-radius:8px;max-width:480px">
            <div style="color:#F59E0B;font-size:11px;font-weight:700;letter-spacing:3px;margin-bottom:12px">CIELO SUNRISE</div>
            <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;margin-bottom:16px">Your booking request is in.</div>
            <p style="color:#9CA3AF;font-size:13px;line-height:1.7">We will confirm your dates within 24 hours and send USDC payment instructions to this email. Payment goes directly to the owner at <strong style="color:#F59E0B">circuit.skr</strong> — no platform fees.</p>
            <div style="background:#0D1117;border:1px solid #1C2333;border-radius:6px;padding:16px;margin:16px 0">
              <p style="margin:0 0 6px;color:#6B7280;font-size:11px">YOUR BOOKING</p>
              <p style="margin:0 0 4px;color:#F8FAFC">Check-in: ${body.check_in}</p>
              <p style="margin:0 0 4px;color:#F8FAFC">Check-out: ${body.check_out}</p>
              <p style="margin:0 0 4px;color:#F8FAFC">Guests: ${body.guests}</p>
              <p style="margin:0;color:#F59E0B;font-weight:700">Est. ${body.est_usdc} USDC</p>
            </div>
            <p style="color:#4B5563;font-size:11px">Booking ID: ${booking_id}</p>
          </div>`,
        }),
      }).catch(() => null);
    }
  }

  return NextResponse.json({ ok: true, booking_id });
}
