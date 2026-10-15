// FILE: app/api/passport/reusable-credentials/institutional-catalog/route.ts

import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";
import {
  listInstitutionalPartnerCatalogForConsent,
  resolveInstitutionalPartnerCatalogEntry,
} from "@/lib/passport/reusableCredential/institutionalPartnerCatalog";

export async function GET(req: NextRequest) {
  const session = await resolveAuthenticatedHolderSession(req);
  if (!session.ok) {
    return NextResponse.json(
      { error: session.message },
      { status: session.error === "forbidden" ? 403 : 401 },
    );
  }

  const partnerId = req.nextUrl.searchParams.get("partner_id")?.trim();
  const policyId = req.nextUrl.searchParams.get("policy_id")?.trim();
  if (partnerId && policyId) {
    const entry = await resolveInstitutionalPartnerCatalogEntry({ partnerId, policyId });
    if (!entry) {
      return NextResponse.json({ error: "unknown_partner_or_policy" }, { status: 404 });
    }
    return NextResponse.json({ build: 568, entry, server_authoritative: true });
  }

  const catalog = await listInstitutionalPartnerCatalogForConsent();
  return NextResponse.json({
    build: 568,
    catalog,
    server_authoritative: true,
    note: "Institution names and policy rules come from server configuration, not client-supplied labels.",
  });
}
