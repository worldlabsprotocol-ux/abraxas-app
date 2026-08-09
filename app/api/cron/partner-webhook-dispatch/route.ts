// FILE: app/api/cron/partner-webhook-dispatch/route.ts
// Dispatch pending partner webhook outbox events.
// Vercel cron: add to vercel.json — see docs/PARTNER_WEBHOOKS.md

import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/partner/webhooks/cronAuth";
import {
  clearDispatcherExecutionFailureAlert,
  notifyDispatcherExecutionFailure,
} from "@/lib/partner/webhooks/webhookAlerts";
import { classifyDispatcherError } from "@/lib/partner/webhooks/webhookDispatchError";
import { recordWebhookDispatchRun } from "@/lib/partner/webhooks/webhookDispatchHealth";
import { processWebhookOutboxBatch } from "@/lib/partner/webhooks/webhookDelivery";

export const dynamic = "force-dynamic";

async function runAlertStep(step: () => Promise<void>): Promise<void> {
  try {
    await step();
  } catch (err) {
    console.error(
      "[partner-webhook-dispatch] alert step failed",
      err instanceof Error ? err.message : err,
    );
  }
}

export async function GET(req: NextRequest) {
  const startedAt = new Date().toISOString();
  const auth = authorizeCronRequest({
    cronSecret: process.env.CRON_SECRET,
    authorizationHeader: req.headers.get("authorization"),
  });

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const summary = await processWebhookOutboxBatch({ limit: 50 });
    const finishedAt = new Date().toISOString();
    await recordWebhookDispatchRun({
      startedAt,
      finishedAt,
      success: true,
      summary,
    });
    await runAlertStep(() => clearDispatcherExecutionFailureAlert());
    return NextResponse.json({
      success: true,
      dispatchedAt: finishedAt,
      summary,
    });
  } catch (err) {
    const classified = classifyDispatcherError(err);
    const finishedAt = new Date().toISOString();
    await recordWebhookDispatchRun({
      startedAt,
      finishedAt,
      success: false,
      errorCode: classified.category,
      summary: { scanned: 0, delivered: 0, retrying: 0, failed: 0, skipped: 0, stale: 0 },
    }).catch(() => undefined);
    await runAlertStep(() => notifyDispatcherExecutionFailure(err));
    return NextResponse.json(
      { success: false, error: classified.category },
      { status: 500 },
    );
  }
}
