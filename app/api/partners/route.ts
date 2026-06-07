// FILE: app/api/partners/route.ts
// Partner application API — saves to Supabase + emails Pablo. No CLI needed.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

interface PartnerBody {
  firm_name: string; contact_name: string; contact_email: string;
  contact_x?: string; partner_type: string; jurisdiction: string;
  license_number?: string; website?: string; notes?: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as PartnerBody;
  if (!body.firm_name || !body.contact_email || !body.partner_type)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const resendKey  = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (resendKey && adminEmail) {
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from:    "Abraxas Protocol <onboarding@resend.dev>",
        to:      [adminEmail],
        subject: `New Partner Application — ${body.firm_name} (${body.partner_type})`,
        html:    `<p style="font-family:monospace">New partner application from <strong>${body.firm_name}</strong> (${body.partner_type}). Contact: ${body.contact_email}. Jurisdiction: ${body.jurisdiction}.</p>`,
      }),
    }).catch(() => null);
  }

  if (SB_URL && SB_KEY) {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    const { error } = await sb.from("partner_applications").insert({
      ...body, status: "pending_review",
    });
    if (error) console.error("[partners]", error.message);
  }

  return NextResponse.json({ ok: true });
}
