// FILE: app/api/account/overview/route.ts
// Read-only account hub state — holder browser session and partner console session (never merged).

import { NextRequest, NextResponse } from "next/server";
import { resolveBrowserSession } from "@/lib/auth/browserSession";
import { resolvePartnerConsoleSession } from "@/lib/partner/launchpad/partnerConsoleSession";
import { buildAccountOverview } from "@/lib/account/buildAccountOverview";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const [holderSession, partnerSession] = await Promise.all([
    resolveBrowserSession(req),
    resolvePartnerConsoleSession(req),
  ]);

  const payload = buildAccountOverview({ holderSession, partnerSession });
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
