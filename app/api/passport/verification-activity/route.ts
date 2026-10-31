// FILE: app/api/passport/verification-activity/route.ts
// Signed-in holder activity. Subject comes from the browser session only.

import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";
import { checkLaunchpadRateLimit } from "@/lib/partner/launchpad/rateLimit";
import { loadPassportVerificationActivity } from "@/lib/passport/verificationActivity/load";
import { passportActivityCopyLeaks } from "@/lib/passport/verificationActivity/view";
import { PASSPORT_ACTIVITY_UNAVAILABLE } from "@/lib/passport/verificationActivity/contract";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await resolveAuthenticatedHolderSession(req);
  if (!session.ok) {
    return NextResponse.json({ ok: false, error: session.message }, { status: session.error === "forbidden" ? 403 : 401 });
  }

  const limited = await checkLaunchpadRateLimit(req, "/api/passport/verification-activity", 30);
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
    const view = await loadPassportVerificationActivity(session.subjectId);
    const serialized = JSON.stringify(view);
    if (passportActivityCopyLeaks(serialized).length > 0) {
      return NextResponse.json({ ok: false, error: PASSPORT_ACTIVITY_UNAVAILABLE }, { status: 503 });
    }
    return NextResponse.json({ ok: true, ...view });
  } catch {
    return NextResponse.json({ ok: false, error: PASSPORT_ACTIVITY_UNAVAILABLE }, { status: 503 });
  }
}
