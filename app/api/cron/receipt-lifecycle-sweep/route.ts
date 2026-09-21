// FILE: app/api/cron/receipt-lifecycle-sweep/route.ts
// Operator/server sweep for receipt.expiring. Not listed in vercel.json crons.

import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/partner/webhooks/cronAuth";
import {
  RECEIPT_LIFECYCLE_SCHEDULING_POSTURE,
  receiptLifecycleSweepRateLimited,
  sweepExpiringReceipts,
} from "@/lib/partner/receiptLifecycle";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = authorizeCronRequest({
    cronSecret: process.env.CRON_SECRET,
    authorizationHeader: req.headers.get("authorization"),
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, live_send: false }, { status: auth.status });
  }
  if (receiptLifecycleSweepRateLimited("receipt-lifecycle-sweep")) {
    return NextResponse.json({ error: "rate_limited", live_send: false }, { status: 429 });
  }
  const result = await sweepExpiringReceipts();
  if (!result.ok) {
    return NextResponse.json({ error: result.error, live_send: false, scheduling: RECEIPT_LIFECYCLE_SCHEDULING_POSTURE }, { status: 503 });
  }
  return NextResponse.json(result);
}
