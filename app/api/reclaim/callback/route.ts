// FILE: app/api/reclaim/callback/route.ts
// Allowlisted Abraxas server callback. Raw proofs stay in memory.

import { NextRequest, NextResponse } from "next/server";
import { acceptReclaimCallback, reclaimCallbackUrl, reclaimPayloadLeaks } from "@/lib/reclaimAttestation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const proofs = await req.json().catch(() => null);
  const result = await acceptReclaimCallback({
    proofs,
    callbackUrl: reclaimCallbackUrl(),
  });
  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      code: result.code,
      issued_receipt: false,
      consent_required: true,
    }, { status: result.status });
  }
  if (reclaimPayloadLeaks(result.view).length > 0) {
    return NextResponse.json({ ok: false, code: "disclosure_rejected", issued_receipt: false }, { status: 503 });
  }
  return NextResponse.json({ ok: true, ...result.view });
}

export async function GET() {
  return NextResponse.json({ ok: false, code: "method_not_allowed", issued_receipt: false }, { status: 405 });
}
