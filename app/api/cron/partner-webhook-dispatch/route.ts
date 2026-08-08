// FILE: app/api/cron/partner-webhook-dispatch/route.ts
// Dispatch pending partner webhook outbox events.
// Vercel cron: add to vercel.json — see docs/PARTNER_WEBHOOKS.md

import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/partner/webhooks/cronAuth";
import { processWebhookOutboxBatch } from "@/lib/partner/webhooks/webhookDelivery";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = authorizeCronRequest({
    cronSecret: process.env.CRON_SECRET,
    authorizationHeader: req.headers.get("authorization"),
  });

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const summary = await processWebhookOutboxBatch({ limit: 50 });
    return NextResponse.json({
      success: true,
      dispatchedAt: new Date().toISOString(),
      summary,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
