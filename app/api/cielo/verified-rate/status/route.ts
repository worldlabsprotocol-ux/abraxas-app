// FILE: app/api/cielo/verified-rate/status/route.ts
// Pre-flight Passport + profile + wallet status for Cielo verified rate (session auth).

import { NextRequest, NextResponse } from "next/server";
import { evaluateCieloVerifiedGuest } from "@/lib/cielo/verifiedGuestPolicy";
import { parseVerifiedRateFixture } from "@/lib/cielo/verifiedRateFixtures";
import { requireBrowserSession } from "@/lib/auth/browserSession";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireBrowserSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const fixture = parseVerifiedRateFixture(req.nextUrl.searchParams.get("fixture"));
  const evaluation = await evaluateCieloVerifiedGuest(auth.session.suiAddress, {
    requireConsent: false,
    fixture,
  });

  return NextResponse.json({ ok: true, evaluation });
}
