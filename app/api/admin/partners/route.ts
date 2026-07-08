// FILE: app/api/admin/partners/route.ts
// Partner org CRUD + onboarding fields for real future relying parties.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkAdmin } from "@/lib/adminAuth";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

type PartnerRow = {
  id: string;
  partner_id: string;
  company: string;
  contact_name: string | null;
  contact_email: string | null;
  status: string;
  allowed_environments: string[];
  legal_entity: string | null;
  use_case: string | null;
  assigned_policy_id: string | null;
  created_at: string;
  usage_count?: number;
  consent_count?: number;
};

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
    .select("id, partner_id, company, contact_name, contact_email, status, allowed_environments, legal_entity, use_case, assigned_policy_id, onboarding_notes, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as PartnerRow[];
  const partners = await Promise.all(rows.map(async row => {
    const [usage, consents] = await Promise.all([
      sb.from("partner_api_usage")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", row.partner_id),
      sb.from("verification_requests")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", row.partner_id)
        .in("status", ["approved", "declined"]),
    ]);
    return {
      ...row,
      usage_count: usage.count ?? 0,
      consent_count: consents.count ?? 0,
    };
  }));

  return NextResponse.json({ partners });
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
    legal_entity?: string;
    contact_name?: string;
    contact_email?: string;
    use_case?: string;
    assigned_policy_id?: string;
    status?: string;
    allowed_environments?: string[];
    onboarding_notes?: string;
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
      legal_entity: body.legal_entity?.trim() ?? null,
      contact_name: body.contact_name?.trim() ?? null,
      contact_email: body.contact_email?.trim() ?? null,
      use_case: body.use_case?.trim() ?? null,
      assigned_policy_id: body.assigned_policy_id?.trim() ?? null,
      onboarding_notes: body.onboarding_notes?.trim() ?? null,
      status: body.status ?? "recruiting",
      allowed_environments: body.allowed_environments ?? ["sandbox"],
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ partner: data });
}
