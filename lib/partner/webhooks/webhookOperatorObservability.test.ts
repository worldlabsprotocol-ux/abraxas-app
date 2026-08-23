import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildWebhookObservabilityStatusCounts,
  deriveWebhookObservabilityFollowUp,
  mapWebhookDeliveryState,
  validateObservabilityEventId,
  validateObservabilityPartnerId,
} from "@/lib/partner/webhooks/webhookOperatorObservability";

describe("webhookOperatorObservability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps canonical delivery states and unknown fail-safe", () => {
    expect(mapWebhookDeliveryState("pending")).toBe("queued_or_in_flight");
    expect(mapWebhookDeliveryState("delivering")).toBe("queued_or_in_flight");
    expect(mapWebhookDeliveryState("retrying")).toBe("retrying");
    expect(mapWebhookDeliveryState("delivered")).toBe("delivered");
    expect(mapWebhookDeliveryState("failed")).toBe("failed");
    expect(mapWebhookDeliveryState("unexpected_status")).toBe("unknown");
  });

  it("builds status counts with unknown bucket", () => {
    const counts = buildWebhookObservabilityStatusCounts([
      { status: "pending" },
      { status: "delivered" },
      { status: "unexpected_status" },
    ]);

    expect(counts.pending).toBe(1);
    expect(counts.delivered).toBe(1);
    expect(counts.unknown).toBe(1);
  });

  it("derives follow-up reasons without exposing secrets", () => {
    const followUp = deriveWebhookObservabilityFollowUp({
      webhookConfigured: false,
      webhookDeliveryEnabled: false,
      statusCounts: {
        pending: 0,
        delivering: 0,
        retrying: 1,
        delivered: 0,
        failed: 2,
        unknown: 0,
      },
    });

    expect(followUp.recommended).toBe(true);
    expect(followUp.reasons).toEqual([
      "webhook_not_configured",
      "failed_deliveries_present",
      "retrying_deliveries_present",
    ]);

    const serialized = JSON.stringify(followUp);
    expect(serialized).not.toContain("endpoint");
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("whsec");
    expect(serialized).not.toContain("payload");
    expect(serialized).not.toContain("CRON");
    expect(serialized).not.toContain("SQLSTATE");
  });

  it("validates partner_id and event_id shape/length", () => {
    expect(validateObservabilityPartnerId("")).toEqual({ ok: false, error: "partner_id_required" });
    expect(validateObservabilityPartnerId("partner-a").ok).toBe(true);
    expect(validateObservabilityPartnerId("a".repeat(129)).ok).toBe(false);
    expect(validateObservabilityEventId("evt-1").ok).toBe(true);
    expect(validateObservabilityEventId("bad id").ok).toBe(false);
  });
});
