// FILE: app/api/passport/requests/route.ts
// Pending partner requests addressed to the signed-in Passport.

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { checkLaunchpadRateLimit } from "@/lib/partner/launchpad/rateLimit";
import { listPassportRequestInbox } from "@/lib/passport/passportRequestInbox";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }

  const limited = await checkLaunchpadRateLimit(req, "/api/passport/requests", 30);
  if (!limited.allowed) {
    return NextResponse.json({ ok: false, error: "Try again shortly." }, { status: 429 });
  }

  try {
    const requests = await listPassportRequestInbox(session.session.suiAddress);
    return NextResponse.json({ ok: true, requests });
  } catch {
    return NextResponse.json({
      ok: false,
      error: "Partner requests are temporarily unavailable.",
    }, { status: 503 });
  }
}
