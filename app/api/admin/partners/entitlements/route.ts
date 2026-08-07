// FILE: app/api/admin/partners/entitlements/route.ts
// Admin partner entitlements configuration — audited, observe-only by default.

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/adminAuth";
import { logAdminPartnerConfigAudit } from "@/lib/admin/partnerOnboardingAudit";
import {
  getPartnerEntitlements,
  upsertPartnerEntitlements,
  type PartnerEnforcementMode,
} from "@/lib/partner/partnerEntitlements";
import { resolveAdminAccess } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const partnerId = req.nextUrl.searchParams.get("partner_id")?.trim();
  if (!partnerId) {
    return NextResponse.json({ error: "partner_id required" }, { status: 400 });
  }

  const entitlements = await getPartnerEntitlements(partnerId);
  return NextResponse.json({
    entitlements: {
      ...entitlements,
      observe_only: entitlements.enforcementMode !== "enforce",
      enforcement_label:
        entitlements.enforcementMode === "enforce"
          ? "Enforcement enabled — limits may block usage when configured."
          : "Observe-only — partners are not blocked or charged by default.",
    },
  });
}

export async function PATCH(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    partner_id?: string;
    plan_id?: string;
    monthly_receipt_limit?: number | null;
    monthly_api_call_limit?: number | null;
    enforcement_mode?: PartnerEnforcementMode;
  };

  const partnerId = body.partner_id?.trim();
  if (!partnerId) {
    return NextResponse.json({ error: "partner_id required" }, { status: 400 });
  }

  if (body.enforcement_mode && body.enforcement_mode !== "observe" && body.enforcement_mode !== "enforce") {
    return NextResponse.json({ error: "invalid_enforcement_mode" }, { status: 400 });
  }

  const access = await resolveAdminAccess(req);
  const updatedBy =
    access.method === "email" && access.email
      ? `admin_email:${access.email.split("@")[0]}`
      : access.method ?? "admin_unknown";

  const updated = await upsertPartnerEntitlements({
    partnerId,
    planId: body.plan_id,
    monthlyReceiptLimit: body.monthly_receipt_limit,
    monthlyApiCallLimit: body.monthly_api_call_limit,
    enforcementMode: body.enforcement_mode,
    updatedBy,
  });

  if (!updated) {
    return NextResponse.json({ error: "Entitlements update failed" }, { status: 503 });
  }

  await logAdminPartnerConfigAudit(req, {
    action: "partner_entitlements.updated",
    object_type: "partner_entitlements",
    object_id: partnerId,
    metadata: {
      plan_id: updated.planId,
      enforcement_mode: updated.enforcementMode,
      monthly_receipt_limit: updated.monthlyReceiptLimit,
      monthly_api_call_limit: updated.monthlyApiCallLimit,
    },
  });

  return NextResponse.json({
    entitlements: {
      ...updated,
      observe_only: updated.enforcementMode !== "enforce",
      enforcement_label:
        updated.enforcementMode === "enforce"
          ? "Enforcement enabled — limits may block usage when configured."
          : "Observe-only — partners are not blocked or charged by default.",
    },
  });
}
