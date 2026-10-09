// FILE: app/api/good-trouble/access-decision/route.ts
// Reference partner server gate. Callback params are not authorization.

import { NextRequest, NextResponse } from "next/server";
import { verifyGoodTroubleSandboxAccess } from "@/lib/goodTrouble/sandboxPartnerVerification";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const result = await verifyGoodTroubleSandboxAccess({ search: req.nextUrl.searchParams });
  const status = result.grant ? 200 : result.outcome === "retry" ? 503 : 403;
  return NextResponse.json({
    grant: result.grant,
    outcome: result.outcome,
    action: result.action,
    errors: result.errors,
    receipt_id: result.receipt_id,
    protected_action_replayed: result.protected_action_replayed ?? false,
    callback_trusted: false,
  }, { status });
}
