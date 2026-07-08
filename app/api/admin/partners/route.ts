// FILE: app/api/admin/partners/route.ts
// Partner org CRUD for admin (PIN required).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkAdmin } from "@/lib/adminAuth";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from("partners")
    .select("id, partner_id, company, contact_name, contact_email, status, allowed_environments, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ partners: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    partner_id?: string;
    company?: string;
    contact_name?: string;
    contact_email?: string;
    status?: string;
    allowed_environments?: string[];
  };

  const partnerId = body.partner_id?.trim();
  const company = body.company?.trim();
  if (!partnerId || !company) {
    return NextResponse.json({ error: "partner_id and company required" }, { status: 400 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from("partners")
    .insert({
      partner_id: partnerId,
      company,
      contact_name: body.contact_name?.trim() ?? null,
      contact_email: body.contact_email?.trim() ?? null,
      status: body.status ?? "active",
      allowed_environments: body.allowed_environments ?? ["sandbox", "production"],
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ partner: data });
}
