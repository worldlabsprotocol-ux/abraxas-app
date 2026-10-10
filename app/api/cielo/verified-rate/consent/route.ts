// FILE: app/api/cielo/verified-rate/consent/route.ts
// Record consent + policy decision for Cielo verified guest v1 (session auth).

import { NextRequest, NextResponse } from "next/server";
import { grantCieloVerifiedGuestConsent } from "@/lib/cielo/verifiedRateService";
import { recordCieloFunnelEvent } from "@/lib/cielo/cieloFunnelEvents";
import { requireBrowserSession } from "@/lib/auth/browserSession";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireBrowserSession(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const result = await grantCieloVerifiedGuestConsent(auth.session.suiAddress);
    void recordCieloFunnelEvent({
      eventType: "policy_evaluated",
      outcome: result.decision,
      correlationId: result.verification_decision_id,
      receiptId: result.receipt_id,
      metadata: { step: "consent" },
    });
    if (result.receipt_id) {
      void recordCieloFunnelEvent({
        eventType: "receipt_issued",
        outcome: result.decision,
        correlationId: result.verification_decision_id,
        receiptId: result.receipt_id,
      });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Consent failed";
    const status = msg.startsWith("Not eligible") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
