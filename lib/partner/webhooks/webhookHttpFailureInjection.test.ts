// FILE: lib/partner/webhooks/webhookHttpFailureInjection.test.ts
// Controlled local HTTP receiver for signed delivery outcomes.

import { describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import { deliverPartnerWebhookEvent } from "@/lib/partner/webhooks/webhookDelivery";

vi.mock("@/lib/partner/webhooks/webhookEndpointValidation", () => ({
  validateWebhookEndpointForDelivery: vi.fn(async (endpointUrl: string) => ({
    ok: true as const,
    deliveryUrl: endpointUrl,
  })),
}));
import {
  signWebhookBody,
  verifyWebhookSignature,
  WEBHOOK_EVENT_ID_HEADER,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
} from "@/lib/partner/webhooks/webhookSigning";
import type { PartnerWebhookOutboxRecord } from "@/lib/partner/webhooks/types";

const SECRET = "abx_whsec_test_local_receiver_secret_123456";

function makeRecord(): PartnerWebhookOutboxRecord {
  return {
    id: "outbox-http-1",
    partner_id: "example-merchant-protocol",
    event_type: "partner.receipt.issued",
    event_id: "evt-http-1",
    idempotency_key: "idem-http-1",
    payload: {
      event_id: "evt-http-1",
      event_type: "partner.receipt.issued",
      occurred_at: "2026-01-01T00:00:00.000Z",
      partner_id: "example-merchant-protocol",
      receipt_id: "dr_http_1",
    },
    occurred_at: "2026-01-01T00:00:00.000Z",
    status: "delivering",
    attempt_count: 0,
    next_attempt_at: "2026-01-01T00:00:00.000Z",
    delivered_at: null,
    last_error_code: null,
    delivery_lease_until: "2026-01-01T00:05:00.000Z",
    delivery_worker_id: "worker-local",
    delivery_claim_id: "claim-local",
    delivery_attempt_number: 1,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

async function withLocalReceiver(
  handler: (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => void,
  run: (url: string) => Promise<void>,
): Promise<void> {
  const server: Server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no address");
  const url = `http://127.0.0.1:${address.port}/webhook`;
  try {
    await run(url);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

describe("webhook HTTP failure injection (local receiver)", () => {
  it("production SSRF guard blocks raw localhost URLs (unmocked validation)", async () => {
    const { validateWebhookEndpointForDelivery } = await vi.importActual<
      typeof import("@/lib/partner/webhooks/webhookEndpointValidation")
    >("@/lib/partner/webhooks/webhookEndpointValidation");
    const check = await validateWebhookEndpointForDelivery("http://127.0.0.1:9999/webhook");
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.error).toBe("endpoint_not_allowed");
  });

  it("delivers with valid signature to localhost receiver", async () => {
    const deliveries: string[] = [];
    await withLocalReceiver((req, res) => {
      let body = "";
      req.on("data", (chunk) => { body += chunk; });
      req.on("end", () => {
        const sig = verifyWebhookSignature({
          secret: SECRET,
          timestamp: String(req.headers[WEBHOOK_TIMESTAMP_HEADER] ?? ""),
          rawBody: body,
          signatureHeader: String(req.headers[WEBHOOK_SIGNATURE_HEADER] ?? ""),
        });
        if (!sig.ok) {
          res.statusCode = 400;
          res.end("bad sig");
          return;
        }
        deliveries.push(body);
        res.statusCode = 200;
        res.end("ok");
      });
    }, async (endpointUrl) => {
      const result = await deliverPartnerWebhookEvent(makeRecord(), SECRET, endpointUrl);
      expect(result.ok).toBe(true);
    });
    expect(deliveries).toHaveLength(1);
  });

  it("records http_500 when receiver fails", async () => {
    await withLocalReceiver((_req, res) => {
      res.statusCode = 500;
      res.end("fail");
    }, async (endpointUrl) => {
      const result = await deliverPartnerWebhookEvent(makeRecord(), SECRET, endpointUrl);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errorCode).toBe("http_500");
    });
  });

  it("treats invalid signature as receiver rejection (simulated)", async () => {
    const rawBody = JSON.stringify(makeRecord().payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const badSig = signWebhookBody({ secret: "abx_whsec_wrong_secret", timestamp, rawBody });
    const check = verifyWebhookSignature({
      secret: SECRET,
      timestamp,
      rawBody,
      signatureHeader: badSig,
    });
    expect(check.ok).toBe(false);
  });

  it("deduplicates duplicate event delivery at receiver (idempotent store simulated)", async () => {
    const seen = new Set<string>();
    await withLocalReceiver((req, res) => {
      const eventId = String(req.headers[WEBHOOK_EVENT_ID_HEADER] ?? "");
      if (seen.has(eventId)) {
        res.statusCode = 200;
        res.end("duplicate_ok");
        return;
      }
      seen.add(eventId);
      res.statusCode = 200;
      res.end("ok");
    }, async (endpointUrl) => {
      const first = await deliverPartnerWebhookEvent(makeRecord(), SECRET, endpointUrl);
      const second = await deliverPartnerWebhookEvent(makeRecord(), SECRET, endpointUrl);
      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      expect(seen.size).toBe(1);
    });
  });

  it("maps fetch network failure to network_error", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    const result = await deliverPartnerWebhookEvent(
      makeRecord(),
      SECRET,
      "http://127.0.0.1:1/webhook",
      { fetchFn: fetchFn as typeof fetch },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("network_error");
  });
});
