// FILE: app/api/v1/verification-requests/[id]/consent/route.ts
// User consents to share claims; policy engine returns decision.

import { NextRequest, NextResponse } from "next/server";
import { consentAndDecide } from "@/lib/verification/requestsService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { sui_address?: string };

  if (!body.sui_address) {
    return NextResponse.json({ error: "sui_address required" }, { status: 400 });
  }

  try {
    const result = await consentAndDecide({
      requestId: id,
      suiAddress: body.sui_address,
    });

    return NextResponse.json({
      decision: result.decision,
      policy_version: undefined,
      claims: result.claims,
      valid_until: result.valid_until,
      decision_reference: result.decision_id,
      reason_codes: result.reason_codes,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Consent failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
