// FILE: app/api/cielo/verified-rate/status/route.ts
// Pre-flight Passport + profile + wallet status for Cielo verified rate.

import { NextRequest, NextResponse } from "next/server";
import { evaluateCieloVerifiedGuest } from "@/lib/cielo/verifiedGuestPolicy";
import { parseVerifiedRateFixture } from "@/lib/cielo/verifiedRateFixtures";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sui = req.nextUrl.searchParams.get("sui_address") ?? req.nextUrl.searchParams.get("sui");
  if (!sui) {
    return NextResponse.json({ error: "sui_address required" }, { status: 400 });
  }

  const fixture = parseVerifiedRateFixture(req.nextUrl.searchParams.get("fixture"));
  const evaluation = await evaluateCieloVerifiedGuest(sui, {
    requireConsent: false,
    fixture,
  });

  return NextResponse.json({ ok: true, evaluation });
}
