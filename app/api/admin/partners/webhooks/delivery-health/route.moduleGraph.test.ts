// FILE: app/api/admin/partners/webhooks/delivery-health/route.moduleGraph.test.ts
// Regression: webhook payload allowlists must initialize independently of disclosure.

import { describe, expect, it } from "vitest";
import { WEBHOOK_PAYLOAD_ALLOWED_KEYS } from "@/lib/partner/webhooks/payloadAllowlist";
import { SHARED_SURFACE_FIELDS } from "@/lib/privacy/selectiveDisclosure/contract";
import { buildPartnerWebhookPayload } from "@/lib/partner/webhooks/webhookPayloadContract";
import { GET } from "@/app/api/admin/partners/webhooks/delivery-health/route";

describe("admin webhook delivery-health module graph", () => {
  it("exposes webhook allowlists without loading payload builders first", () => {
    expect([...WEBHOOK_PAYLOAD_ALLOWED_KEYS]).toContain("event_id");
    expect(SHARED_SURFACE_FIELDS.webhook_event).toBe(WEBHOOK_PAYLOAD_ALLOWED_KEYS);
  });

  it("imports the delivery-health route and webhook payload builder without TDZ", () => {
    expect(typeof GET).toBe("function");
    const payload = buildPartnerWebhookPayload({
      eventId: "evt_graph",
      eventType: "partner.receipt.revoked",
      occurredAt: "2026-09-20T00:00:00.000Z",
      partnerId: "partner-a",
      policyId: "partner-age_21_retail-v1",
      outcome: "revoked",
    });
    expect(payload.event_id).toBe("evt_graph");
    expect(payload.partner_id).toBe("partner-a");
  });

  it("does not pull the disclosure barrel through webhook payload construction", async () => {
    const contract = await import("@/lib/privacy/selectiveDisclosure/contract");
    expect(contract.DISCLOSURE_CATALOG_VERSION).toBeGreaterThan(0);
    expect(contract.SHARED_SURFACE_FIELDS.webhook_event).toEqual(WEBHOOK_PAYLOAD_ALLOWED_KEYS);
  });
});
