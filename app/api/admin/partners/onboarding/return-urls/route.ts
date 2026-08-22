// FILE: app/api/admin/partners/onboarding/return-urls/route.ts
// Add validated HTTPS callback URLs to partner allowlist.

import { NextRequest, NextResponse } from "next/server";
import { checkProductionSensitiveAdminAccess } from "@/lib/adminAuth";
import { logAdminPartnerConfigAudit } from "@/lib/admin/partnerOnboardingAudit";
import {
  mergeReturnUrlAllowlist,
  validateReturnUrlsForAllowlist,
} from "@/lib/admin/partnerOnboardingConsole";
import {
  enrichPartnerOnboardingDetail,
  loadPartnerOnboardingRecord,
} from "@/lib/admin/partnerOnboardingService";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    partner_id?: string;
    return_urls?: string[];
  };

  const partnerId = body.partner_id?.trim();
  const urls = Array.isArray(body.return_urls) ? body.return_urls : [];
  if (!partnerId) {
    return NextResponse.json({ error: "partner_id required" }, { status: 400 });
  }
  if (urls.length === 0) {
    return NextResponse.json({ error: "return_urls array required" }, { status: 400 });
  }

  const validation = validateReturnUrlsForAllowlist(urls);
  if (validation.rejected.length > 0) {
    return NextResponse.json(
      {
        error: "Invalid callback URL(s)",
        rejected: validation.rejected,
      },
      { status: 400 },
    );
  }

  try {
    const sb = requireSupabaseAdmin();
    const { data: existing, error: loadError } = await sb
      .from("partners")
      .select("allowed_return_urls")
      .eq("partner_id", partnerId)
      .maybeSingle();

    if (loadError) {
      return NextResponse.json({ error: loadError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const merged = mergeReturnUrlAllowlist(
      existing.allowed_return_urls as string[] | null,
      validation.accepted,
    );

    const { error: updateError } = await sb
      .from("partners")
      .update({
        allowed_return_urls: merged,
        updated_at: new Date().toISOString(),
      })
      .eq("partner_id", partnerId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await logAdminPartnerConfigAudit(req, {
      action: "admin.partner.return_url.add",
      object_type: "partner",
      object_id: partnerId,
      metadata: {
        added_count: validation.accepted.length,
        total_allowlisted: merged.length,
      },
    });

    const record = await loadPartnerOnboardingRecord(partnerId);
    return NextResponse.json({
      ok: true,
      allowed_return_urls: merged,
      partner: record ? enrichPartnerOnboardingDetail(record) : null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update return URLs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
