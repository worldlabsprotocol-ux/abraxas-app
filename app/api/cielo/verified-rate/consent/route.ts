// FILE: app/api/cielo/verified-rate/consent/route.ts
// Record consent + policy decision for Cielo verified guest v1.

import { NextRequest, NextResponse } from "next/server";
import { grantCieloVerifiedGuestConsent } from "@/lib/cielo/verifiedRateService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { sui_address?: string };
  const sui = body.sui_address?.trim();
  if (!sui) {
    return NextResponse.json({ error: "sui_address required" }, { status: 400 });
  }

  try {
    const result = await grantCieloVerifiedGuestConsent(sui);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Consent failed";
    const status = msg.startsWith("Not eligible") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
