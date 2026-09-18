import { describe, expect, it } from "vitest";
import {
  LAUNCHPAD_WEBHOOK_PUBLIC_FAILURE_CODES,
  toLaunchpadWebhookPublicFailureCode,
} from "@/lib/partner/eventDelivery/publicFailure";

describe("Launchpad webhook public failure mapping", () => {
  it("keeps only the whitelisted public codes", () => {
    expect([...LAUNCHPAD_WEBHOOK_PUBLIC_FAILURE_CODES]).toEqual([
      "event_type_not_supported",
      "persistence_failed",
      "enqueue_unavailable",
      "webhook_not_configured",
      "webhook_disabled",
    ]);
  });

  it("maps RPC and schema failures onto safe codes", () => {
    expect(toLaunchpadWebhookPublicFailureCode("enqueue_unavailable")).toBe("enqueue_unavailable");
    expect(toLaunchpadWebhookPublicFailureCode("enqueue_failed")).toBe("enqueue_unavailable");
    expect(toLaunchpadWebhookPublicFailureCode("rate_limited")).toBe("enqueue_unavailable");
    expect(toLaunchpadWebhookPublicFailureCode("webhook_disabled")).toBe("webhook_disabled");
    expect(toLaunchpadWebhookPublicFailureCode("partner_not_found")).toBe("webhook_not_configured");
    expect(toLaunchpadWebhookPublicFailureCode("event_type_not_supported")).toBe("event_type_not_supported");
    expect(toLaunchpadWebhookPublicFailureCode("persistence_failed")).toBe("persistence_failed");
  });

  it("never returns raw Postgres messages", () => {
    expect(toLaunchpadWebhookPublicFailureCode("23514")).toBe("persistence_failed");
    expect(toLaunchpadWebhookPublicFailureCode("violates check constraint")).toBe("persistence_failed");
    expect(toLaunchpadWebhookPublicFailureCode("PGRST202")).toBe("persistence_failed");
    expect(toLaunchpadWebhookPublicFailureCode("password authentication failed")).toBe("persistence_failed");
  });
});
