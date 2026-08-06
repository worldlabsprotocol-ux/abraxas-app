// FILE: app/api/admin/partners/onboarding/route.ts
// Admin Partner Onboarding Console — list, detail, create pilot partners.

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/adminAuth";
import { logAdminPartnerConfigAudit } from "@/lib/admin/partnerOnboardingAudit";
import {
  assertPilotPartnerCreateStatus,
} from "@/lib/admin/partnerOnboardingConsole";
import {
  enrichPartnerOnboardingDetail,
  loadPartnerOnboardingRecord,
  loadPartnerOnboardingRecords,
} from "@/lib/admin/partnerOnboardingService";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const partnerId = req.nextUrl.searchParams.get("partner_id")?.trim();
    if (partnerId) {
      const record = await loadPartnerOnboardingRecord(partnerId);
      if (!record) {
        return NextResponse.json({ error: "Partner not found" }, { status: 404 });
      }
      return NextResponse.json({ partner: enrichPartnerOnboardingDetail(record) });
    }

    const partners = await loadPartnerOnboardingRecords();
    return NextResponse.json({
      partners: partners.map(enrichPartnerOnboardingDetail),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load onboarding records";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    partner_id?: string;
    company?: string;
    legal_entity?: string;
    contact_name?: string;
    contact_email?: string;
    use_case?: string;
    status?: string;
    allowed_environments?: string[];
  };

  const partnerId = body.partner_id?.trim();
  const company = body.company?.trim();
  if (!partnerId || !company) {
    return NextResponse.json({ error: "partner_id and company required" }, { status: 400 });
  }

  let status: string;
  try {
    status = assertPilotPartnerCreateStatus(body.status?.trim() || "pilot");
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid status" },
      { status: 400 },
    );
  }

  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb
      .from("partners")
      .insert({
        partner_id: partnerId,
        company,
        legal_entity: body.legal_entity?.trim() ?? null,
        contact_name: body.contact_name?.trim() ?? null,
        contact_email: body.contact_email?.trim() ?? null,
        use_case: body.use_case?.trim() ?? null,
        status,
        is_external: true,
        allowed_environments: body.allowed_environments ?? ["sandbox"],
        allowed_return_urls: [],
        updated_at: new Date().toISOString(),
      })
      .select(
        "partner_id, company, status, is_external, allowed_environments, allowed_return_urls, assigned_policy_id, use_case, legal_entity, created_at, updated_at",
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminPartnerConfigAudit(req, {
      action: "admin.partner.create",
      object_type: "partner",
      object_id: partnerId,
      metadata: {
        status,
        allowed_environments: body.allowed_environments ?? ["sandbox"],
        is_external: true,
      },
    });

    const record = await loadPartnerOnboardingRecord(partnerId);
    return NextResponse.json({
      partner: record ? enrichPartnerOnboardingDetail(record) : data,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Create partner failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
