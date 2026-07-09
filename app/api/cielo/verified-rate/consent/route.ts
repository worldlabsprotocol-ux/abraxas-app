// FILE: app/api/cielo/verified-rate/consent/route.ts
// Record consent + policy decision for Cielo verified guest v1 (session auth).

import { NextRequest, NextResponse } from "next/server";
import { grantCieloVerifiedGuestConsent } from "@/lib/cielo/verifiedRateService";
import { requireBrowserSession } from "@/lib/auth/browserSession";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireBrowserSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const result = await grantCieloVerifiedGuestConsent(auth.session.suiAddress);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Consent failed";
    const status = msg.startsWith("Not eligible") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
