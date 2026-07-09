// FILE: app/api/admin/issuers/route.ts
// Admin issuer onboarding — no public self-serve portal.

import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/adminAuth";
import { listIssuersForAdmin } from "@/lib/trust/issuerFramework";

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const issuers = await listIssuersForAdmin();
  return NextResponse.json({
    issuers: issuers.map(i => ({
      id: i.id,
      legal_name: i.legal_name,
      display_name: i.display_name,
      issuer_type: i.issuer_type,
      issuer_status: i.issuer_status,
      supported_claims: i.supported_claims,
      jurisdictions: i.jurisdictions,
      assurance_levels: i.assurance_levels,
      audit_status: i.audit_status,
      metadata: i.metadata,
      pilot_note: i.metadata?.demo ? "internal_demo" : i.audit_status === "contracted" ? "pilot_config" : "self_attested",
    })),
  });
}
