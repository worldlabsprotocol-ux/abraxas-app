// FILE: app/api/v1/verification-requests/[id]/consent/route.ts
// Holder consents via browser session; policy engine returns decision.

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { consentAndDecide } from "@/lib/verification/requestsService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { id } = await params;

  try {
    const result = await consentAndDecide({
      requestId: id,
      suiAddress: session.session.suiAddress,
    });

    return NextResponse.json({
      decision: result.decision,
      claims: result.claims,
      valid_until: result.valid_until,
      decision_reference: result.decision_id,
      receipt_id: result.receipt_id,
      receipt_public_url: result.receipt_id
        ? `${process.env.NEXT_PUBLIC_APP_URL ?? "https://abraxas-app.vercel.app"}/api/receipts/${result.receipt_id}/public`
        : null,
      reason_codes: result.reason_codes,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Consent failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
