// FILE: app/api/partner/webhooks/sandbox-test-receiver/route.ts
// Verified-only inbound receiver for sandbox partner.webhook.test events.

import { NextRequest, NextResponse } from "next/server";
import {
  SANDBOX_RECEIVER_GENERIC_ERROR,
  SANDBOX_RECEIVER_REQUEST_HEADERS,
  receiveSandboxTestWebhook,
} from "@/lib/partner/webhooks/webhookSandboxTestReceiver";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const result = await receiveSandboxTestWebhook({
    rawBody,
    headerEventId: req.headers.get(SANDBOX_RECEIVER_REQUEST_HEADERS.eventId),
    headerTimestamp: req.headers.get(SANDBOX_RECEIVER_REQUEST_HEADERS.timestamp),
    headerSignature: req.headers.get(SANDBOX_RECEIVER_REQUEST_HEADERS.signature),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: SANDBOX_RECEIVER_GENERIC_ERROR },
      { status: result.status },
    );
  }

  return NextResponse.json({
    ok: true,
    received: true,
    ...(result.idempotent ? { idempotent: true } : {}),
  });
}
