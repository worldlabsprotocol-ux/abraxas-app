// FILE: app/api/integrations/apply/route.ts
// Design partner / external protocol integration applications.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminEmailShell, adminEmailTable, sendAdminEmail } from "@/lib/notify/adminResend";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      company?: string;
      contact_name?: string;
      email?: string;
      website?: string;
      use_case?: string;
      monthly_volume?: string;
      integration_type?: string;
      public_name_ok?: boolean;
    };

    const email = body.email?.trim();
    const company = body.company?.trim();
    if (!email?.includes("@") || !company) {
      return NextResponse.json({ error: "Company and valid email required" }, { status: 400 });
    }

    const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    if (!SB_URL || !SB_KEY) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    const { error } = await sb.from("design_partners").insert({
      company,
      contact_name: body.contact_name?.trim() ?? null,
      email,
      website: body.website?.trim() ?? null,
      use_case: body.use_case?.trim() ?? null,
      monthly_volume: body.monthly_volume?.trim() ?? null,
      integration_type: body.integration_type?.trim() ?? "passport_gate",
      public_name_ok: Boolean(body.public_name_ok),
      status: "submitted",
    });

    if (error) {
      console.error("[integrations/apply]", error.message);
      return NextResponse.json({ error: "Could not save application" }, { status: 500 });
    }

    void sendAdminEmail({
      subject: `Design partner application — ${company}`,
      html: adminEmailShell(
        "New Design Partner Application",
        adminEmailTable({
          Company: company,
          Contact: body.contact_name?.trim() ?? "—",
          Email: email,
          Website: body.website?.trim() ?? "—",
          "Use case": body.use_case?.trim() ?? "—",
          Volume: body.monthly_volume?.trim() ?? "—",
          Integration: body.integration_type?.trim() ?? "passport_gate",
          "Public name OK": body.public_name_ok ? "yes" : "no",
        }),
      ),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
