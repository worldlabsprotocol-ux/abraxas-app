// FILE: app/api/account/overview/route.ts
// Read-only account hub state — holder browser session and partner console session (never merged).

import { NextRequest, NextResponse } from "next/server";
import { resolveBrowserSession } from "@/lib/auth/browserSession";
import { resolveAccountSession } from "@/lib/auth/accountSession";
import { resolvePartnerConsoleSession } from "@/lib/partner/launchpad/partnerConsoleSession";
import { buildAccountOverview } from "@/lib/account/buildAccountOverview";
import { listPartnerMemberships } from "@/lib/auth/nativeAccount/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const [holderSession, partnerSession, nativeAccountSession] = await Promise.all([
    resolveBrowserSession(req),
    resolvePartnerConsoleSession(req),
    resolveAccountSession(req),
  ]);

  let partnerMembershipCount = 0;
  if (nativeAccountSession) {
    try {
      const memberships = await listPartnerMemberships(nativeAccountSession.accountId);
      partnerMembershipCount = memberships.length;
    } catch {
      partnerMembershipCount = 0;
    }
  }

  const payload = buildAccountOverview({
    holderSession,
    partnerSession,
    nativeAccountSession,
    partnerMembershipCount,
  });
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
