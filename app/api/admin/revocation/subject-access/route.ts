// FILE: app/api/admin/revocation/subject-access/route.ts
// Safe subject partner-access view for admin revocation UI — no PII.

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/adminAuth";
import { listSubjectPartnerAccess } from "@/lib/decisionReceipts/revocationControlPlane";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subjectId = req.nextUrl.searchParams.get("subject_id")?.trim();
  if (!subjectId) {
    return NextResponse.json({ error: "subject_id required" }, { status: 400 });
  }

  const access = await listSubjectPartnerAccess(subjectId);
  return NextResponse.json({
    subject_pseudonym_id: access.subject_pseudonym_id,
    claims: access.claims,
    receipts: access.receipts,
    note: "Revoking access immediately prevents future partner validation using affected receipts.",
  });
}
