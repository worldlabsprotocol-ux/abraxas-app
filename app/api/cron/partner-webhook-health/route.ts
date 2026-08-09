// FILE: app/api/cron/partner-webhook-health/route.ts
// Periodic partner webhook health evaluation and operational email alerts.

import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/partner/webhooks/cronAuth";
import { classifyOperationalError } from "@/lib/partner/webhooks/webhookDispatchError";
import { evaluateWebhookHealthAlerts } from "@/lib/partner/webhooks/webhookHealthMonitor";

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
    const result = await evaluateWebhookHealthAlerts();
    return NextResponse.json({
      success: true,
      checkedAt: new Date().toISOString(),
      evaluated: result.evaluated,
      alertsSent: result.sent,
      recoveriesSent: result.recovered,
    });
  } catch (err) {
    const classified = classifyOperationalError(err);
    return NextResponse.json(
      {
        success: false,
        error: classified.category,
        error_fingerprint: classified.fingerprint,
      },
      { status: 500 },
    );
  }
}
