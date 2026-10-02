// FILE: app/api/passport/verification-activity/withdraw-all/route.ts
// Emergency holder control: withdraw every current result visible to this Passport session.

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { checkLaunchpadRateLimit } from "@/lib/partner/launchpad/rateLimit";
import { loadPassportVerificationActivity } from "@/lib/passport/verificationActivity/load";
import { withdrawHolderSharedResult } from "@/lib/passport/verificationActivity/withdraw";
import { PASSPORT_ACTIVITY_WITHDRAW_UNAVAILABLE } from "@/lib/passport/verificationActivity/contract";

export const dynamic = "force-dynamic";

const CONFIRMATION = "withdraw_all_current";

export async function POST(req: NextRequest) {
  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }

  const limited = await checkLaunchpadRateLimit(
    req,
    "/api/passport/verification-activity/withdraw-all",
    3,
  );
  if (!limited.allowed) {
    return NextResponse.json({ ok: false, error: "Try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (
    body.confirm !== CONFIRMATION
    || Object.keys(body).some(key => key !== "confirm")
    || req.nextUrl.searchParams.size > 0
  ) {
    return NextResponse.json({ ok: false, error: "Confirm withdrawal from Passport." }, { status: 400 });
  }

  try {
    const activity = await loadPassportVerificationActivity(session.session.suiAddress);
    const current = activity.items.filter(item => item.current);

    let withdrawn = 0;
    let alreadyWithdrawn = 0;
    let failed = 0;

    for (const item of current) {
      const result = await withdrawHolderSharedResult({
        subjectId: session.session.suiAddress,
        activityRef: item.activity_ref,
        clientBody: { activity_ref: item.activity_ref },
      });
      if (!result.ok) {
        failed += 1;
      } else if (result.view.already_withdrawn) {
        alreadyWithdrawn += 1;
      } else {
        withdrawn += 1;
      }
    }

    const total = current.length;
    const nextStep = total === 0
      ? "There are no current shared results to withdraw."
      : failed === 0
        ? "All current shared results are now in History. Future partner checks will not accept them."
        : `${withdrawn + alreadyWithdrawn} of ${total} current results moved to History. Try again for the remaining results.`;

    return NextResponse.json({
      ok: failed === 0,
      withdrawn,
      already_withdrawn: alreadyWithdrawn,
      failed,
      next_step: nextStep,
    }, { status: failed === 0 ? 200 : failed < total ? 207 : 503 });
  } catch {
    return NextResponse.json({ ok: false, error: PASSPORT_ACTIVITY_WITHDRAW_UNAVAILABLE }, { status: 503 });
  }
}
