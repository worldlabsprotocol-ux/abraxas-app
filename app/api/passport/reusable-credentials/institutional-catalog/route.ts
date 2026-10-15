// FILE: app/api/passport/reusable-credentials/institutional-catalog/route.ts

import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";
import {
  listInstitutionalPartnerCatalogForConsent,
  resolveInstitutionalPartnerCatalogEntry,
} from "@/lib/passport/reusableCredential/institutionalPartnerCatalog";
import { isPassportReusableCredentialDemoAllowed } from "@/lib/passport/reusableCredential/sandboxGate";
import { isPassportInstitutionalSandboxFixturesEnabled } from "@/lib/passport/reusableCredential/institutionalSandboxFixtures";

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
  const includeSandboxFixtures =
    isPassportInstitutionalSandboxFixturesEnabled()
    || isPassportReusableCredentialDemoAllowed();

  if (partnerId && policyId) {
    const entry = await resolveInstitutionalPartnerCatalogEntry({
      partnerId,
      policyId,
      includeSandboxFixtures,
    });
    if (!entry) {
      return NextResponse.json({ error: "unknown_partner_or_policy" }, { status: 404 });
    }
    return NextResponse.json({ build: 568, entry, server_authoritative: true });
  }

  const catalog = await listInstitutionalPartnerCatalogForConsent({ includeSandboxFixtures });
  return NextResponse.json({
    build: 568,
    catalog,
    server_authoritative: true,
    note: "Institution names and policy rules come from server configuration, not client-supplied labels.",
  });
}
