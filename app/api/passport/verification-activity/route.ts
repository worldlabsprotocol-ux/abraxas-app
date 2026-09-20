// FILE: app/api/passport/verification-activity/route.ts
// Signed-in holder activity. Subject comes from the browser session only.

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { checkLaunchpadRateLimit } from "@/lib/partner/launchpad/rateLimit";
import { loadPassportVerificationActivity } from "@/lib/passport/verificationActivity/load";
import { passportActivityCopyLeaks } from "@/lib/passport/verificationActivity/view";
import { PASSPORT_ACTIVITY_UNAVAILABLE } from "@/lib/passport/verificationActivity/contract";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }

  const limited = checkLaunchpadRateLimit(req, "/api/passport/verification-activity", 30);
  if (!limited.allowed) {
    return NextResponse.json({ ok: false, error: "Try again shortly." }, { status: 429 });
  }

  if (
    req.nextUrl.searchParams.get("subject")
    || req.nextUrl.searchParams.get("sui")
    || req.nextUrl.searchParams.get("partner_id")
    || req.nextUrl.searchParams.get("receipt_id")
  ) {
    // Client selectors are never authority. Session subject still applies.
  }

  try {
    const view = await loadPassportVerificationActivity(session.session.suiAddress);
    const serialized = JSON.stringify(view);
    if (passportActivityCopyLeaks(serialized).length > 0) {
      return NextResponse.json({ ok: false, error: PASSPORT_ACTIVITY_UNAVAILABLE }, { status: 503 });
    }
    return NextResponse.json({ ok: true, ...view });
  } catch {
    return NextResponse.json({ ok: false, error: PASSPORT_ACTIVITY_UNAVAILABLE }, { status: 503 });
  }
}
