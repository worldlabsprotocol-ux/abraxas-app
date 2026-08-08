// FILE: app/api/admin/partners/webhooks/rotate-secret/route.ts
// Rotate partner webhook signing secret — reveal once only.

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/adminAuth";
import { rotatePartnerWebhookSigningSecret } from "@/lib/partner/webhooks/webhookConfigService";

export async function POST(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { partner_id?: string };
  if (!body.partner_id?.trim()) {
    return NextResponse.json({ error: "partner_id required" }, { status: 400 });
  }

  const result = await rotatePartnerWebhookSigningSecret(body.partner_id.trim());
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    signing_secret: result.signing_secret,
    prefix: result.prefix,
    notice: result.notice,
  });
}
