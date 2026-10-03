// FILE: app/api/admin/revocation/subject-access/route.ts
// Safe subject partner-access view for admin revocation UI — no PII.

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { listSubjectPartnerAccess } from "@/lib/decisionReceipts/revocationControlPlane";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;

  const subjectId = req.nextUrl.searchParams.get("subject_id")?.trim();
  const partnerId = req.nextUrl.searchParams.get("partner_id")?.trim() || undefined;
  if (!subjectId) {
    return NextResponse.json({ error: "subject_id required" }, { status: 400 });
  }

  const access = await listSubjectPartnerAccess(subjectId, partnerId);
  return NextResponse.json({
    subject_pseudonym_id: access.subject_pseudonym_id,
    partner_id: access.partner_id,
    claims: access.claims,
    receipts: access.receipts,
    note: partnerId
      ? `Partner-scoped view for ${partnerId}. Revocation affects only this partner's receipts for the subject.`
      : "Provide partner_id to scope revocation to a single partner.",
  });
}
