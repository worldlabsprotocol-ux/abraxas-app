// FILE: lib/partner/eventDelivery/examples.ts
// Server-side Partner Event Delivery examples. Webhook is not final authorization.

import type { AbraxasPartnerKitOptions } from "@/lib/partner/integrationKit/client";

export function nextjsWebhookHandlerExample(
  opts: Pick<AbraxasPartnerKitOptions, "partnerId" | "policyId" | "environment">,
): string {
  return `// app/api/abraxas/webhooks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AbraxasPartnerKit, permitProtocolAction } from "@/lib/partner/integrationKit";
import { verifyPartnerWebhookEvent } from "@/lib/partner/eventDelivery";

const kit = new AbraxasPartnerKit({
  partnerId: "${opts.partnerId}",
  policyId: "${opts.policyId}",
  environment: "${opts.environment}",
  baseUrl: process.env.ABRAXAS_BASE_URL,
});

const seenEventIds = new Set<string>();

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const verified = verifyPartnerWebhookEvent({
    secret: process.env.ABRAXAS_WEBHOOK_SECRET ?? "",
    timestamp: req.headers.get("x-abraxas-webhook-timestamp") ?? "",
    rawBody,
    signatureHeader: req.headers.get("x-abraxas-webhook-signature") ?? "",
    expectedPartnerId: kit.options.partnerId,
    seenEventIds,
  });

  if (!verified.ok) {
    return NextResponse.json({ accepted: false, error: verified.error }, { status: 400 });
  }
  if (verified.duplicate) {
    return NextResponse.json({ accepted: true, duplicate: true });
  }

  const receiptId = verified.payload.receipt_id;
  if (!receiptId) {
    return NextResponse.json({ accepted: true, grant: false, reason: "no_receipt" });
  }

  const result = await kit.verifyReceiptId(receiptId);
  if (!permitProtocolAction(result)) {
    return NextResponse.json({ accepted: true, grant: false, outcome: result.outcome });
  }
  return NextResponse.json({ accepted: true, grant: true, outcome: "permitted" });
}
`;
}

export function expressWebhookHandlerExample(
  opts: Pick<AbraxasPartnerKitOptions, "partnerId" | "policyId" | "environment">,
): string {
  return `// express webhook receiver
import express from "express";
import { AbraxasPartnerKit, permitProtocolAction } from "@/lib/partner/integrationKit";
import { verifyPartnerWebhookEvent } from "@/lib/partner/eventDelivery";

const kit = new AbraxasPartnerKit({
  partnerId: "${opts.partnerId}",
  policyId: "${opts.policyId}",
  environment: "${opts.environment}",
});

const seenEventIds = new Set();

app.post("/webhooks/abraxas", express.raw({ type: "application/json" }), async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body ?? "");
  const verified = verifyPartnerWebhookEvent({
    secret: process.env.ABRAXAS_WEBHOOK_SECRET,
    timestamp: String(req.headers["x-abraxas-webhook-timestamp"] ?? ""),
    rawBody,
    signatureHeader: String(req.headers["x-abraxas-webhook-signature"] ?? ""),
    expectedPartnerId: kit.options.partnerId,
    seenEventIds,
  });

  if (!verified.ok) return res.status(400).json({ accepted: false, error: verified.error });
  if (verified.duplicate) return res.json({ accepted: true, duplicate: true });

  if (!verified.payload.receipt_id) return res.json({ accepted: true, grant: false });
  const result = await kit.verifyReceiptId(verified.payload.receipt_id);
  return res.json({
    accepted: true,
    grant: permitProtocolAction(result),
    outcome: result.outcome,
  });
});
`;
}
