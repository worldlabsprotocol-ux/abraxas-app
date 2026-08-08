// FILE: app/api/admin/partners/webhooks/route.ts
// Admin partner webhook configuration.

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/adminAuth";
import {
  listPartnerWebhookConfigs,
  setPartnerWebhookEnabled,
  upsertPartnerWebhookEndpoint,
} from "@/lib/partner/webhooks/webhookConfigService";
import { webhookEndpointFormErrorMessage } from "@/lib/partner/webhooks/webhookEndpointFormValidation";
import { WEBHOOK_NOTIFICATION_DISCLAIMER } from "@/lib/partner/webhooks/webhookPayloadContract";

export async function GET(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configs = await listPartnerWebhookConfigs();
  return NextResponse.json({
    configs,
    disclaimer: WEBHOOK_NOTIFICATION_DISCLAIMER,
  });
}

export async function POST(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    partner_id?: string;
    endpoint_url?: string;
  };

  if (!body.partner_id?.trim() || !body.endpoint_url?.trim()) {
    return NextResponse.json({ error: "partner_id and endpoint_url required" }, { status: 400 });
  }

  const result = await upsertPartnerWebhookEndpoint({
    partnerId: body.partner_id.trim(),
    endpointUrl: body.endpoint_url.trim(),
  });

  if (!result.ok) {
    return NextResponse.json({
      error: result.error,
      message: webhookEndpointFormErrorMessage(result.error),
    }, { status: 400 });
  }

  return NextResponse.json({
    config: result.config,
    signing_secret: result.signing_secret,
    notice: result.notice,
  }, { status: result.signing_secret ? 201 : 200 });
}

export async function PATCH(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    partner_id?: string;
    enabled?: boolean;
  };

  if (!body.partner_id?.trim() || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "partner_id and enabled required" }, { status: 400 });
  }

  const result = await setPartnerWebhookEnabled({
    partnerId: body.partner_id.trim(),
    enabled: body.enabled,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
