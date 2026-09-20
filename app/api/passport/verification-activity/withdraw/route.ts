// FILE: app/api/passport/verification-activity/withdraw/route.ts
// Signed-in holder withdrawal. Opaque activity_ref only. Session subject is authority.

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { checkLaunchpadRateLimit } from "@/lib/partner/launchpad/rateLimit";
import {
  holderWithdrawalClientError,
  withdrawHolderSharedResult,
} from "@/lib/passport/verificationActivity/withdraw";
import { PASSPORT_ACTIVITY_WITHDRAW_UNAVAILABLE } from "@/lib/passport/verificationActivity/contract";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return NextResponse.json(holderWithdrawalClientError("sign_in_required"), { status: 401 });
  }

  const limited = checkLaunchpadRateLimit(req, "/api/passport/verification-activity/withdraw", 10);
  if (!limited.allowed) {
    return NextResponse.json({ ok: false, error: "Try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (
    req.nextUrl.searchParams.get("subject")
    || req.nextUrl.searchParams.get("receipt_id")
    || req.nextUrl.searchParams.get("decision_id")
  ) {
    // Query selectors are never authority.
  }

  try {
    const result = await withdrawHolderSharedResult({
      subjectId: session.session.suiAddress,
      activityRef: body.activity_ref,
      clientBody: body,
    });
    if (!result.ok) {
      return NextResponse.json(holderWithdrawalClientError(result.error), { status: result.status });
    }
    return NextResponse.json(result.view);
  } catch {
    return NextResponse.json({ ok: false, error: PASSPORT_ACTIVITY_WITHDRAW_UNAVAILABLE }, { status: 503 });
  }
}
