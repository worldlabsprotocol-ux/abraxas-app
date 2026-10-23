// FILE: app/api/account/overview/route.ts
// Read-only account hub state — holder browser session and partner console session (never merged).

import { NextRequest, NextResponse } from "next/server";
import { resolveBrowserSession } from "@/lib/auth/browserSession";
import { resolveAccountSession } from "@/lib/auth/accountSession";
import { resolveEphemeralWalletSession } from "@/lib/auth/ephemeralWallet/walletSession";
import { resolvePartnerConsoleSession } from "@/lib/partner/launchpad/partnerConsoleSession";
import { buildAccountOverview } from "@/lib/account/buildAccountOverview";
import { listPartnerMemberships } from "@/lib/auth/nativeAccount/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const [holderSession, partnerSession, nativeAccountSession, ephemeralWalletSession] = await Promise.all([
    resolveBrowserSession(req),
    resolvePartnerConsoleSession(req),
    resolveAccountSession(req),
    resolveEphemeralWalletSession(req),
  ]);

  let partnerMembershipCount = 0;
  let partnerMemberships: Array<{ partner_id: string; role: string }> = [];
  if (nativeAccountSession) {
    try {
      const memberships = await listPartnerMemberships(nativeAccountSession.accountId);
      partnerMembershipCount = memberships.length;
      partnerMemberships = memberships.map((m) => ({ partner_id: m.partner_id, role: m.role }));
    } catch {
      partnerMembershipCount = 0;
      partnerMemberships = [];
    }
  }

  const payload = buildAccountOverview({
    holderSession,
    partnerSession,
    nativeAccountSession,
    ephemeralWalletSession,
    partnerMembershipCount,
    partnerMemberships,
  });
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
