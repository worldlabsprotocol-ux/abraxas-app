// FILE: lib/partner/integrationObservability/recordOnce.test.ts

import { beforeEach, describe, expect, it } from "vitest";
import { buildDeterministicIntegrationEventId } from "./deterministicEventId";
import {
  listIntegrationEventsForTests,
  recordIntegrationEventOnce,
  resetIntegrationEventsForTests,
} from "./record";

describe("recordIntegrationEventOnce durable idempotency", () => {
  beforeEach(() => {
    resetIntegrationEventsForTests();
  });

  it("dedupes concurrent duplicate writes with a stable event id", async () => {
    const input = {
      partnerId: "institutional-rp-example",
      applicationId: "11111111-1111-1111-1111-111111111111",
      environment: "sandbox" as const,
      eventType: "holder_flow_completed" as const,
      lifecycleStage: "holder" as const,
      requestId: "req_concurrent",
      correlationId: "cred:concurrent",
    };
    const results = await Promise.all([
      recordIntegrationEventOnce(input),
      recordIntegrationEventOnce(input),
      recordIntegrationEventOnce(input),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(listIntegrationEventsForTests()).toHaveLength(1);
    expect(listIntegrationEventsForTests()[0]?.event_id).toBe(buildDeterministicIntegrationEventId(input));
  });

  it("allows separate tenants and environments", async () => {
    const shared = {
      environment: "sandbox" as const,
      eventType: "receipt_issued" as const,
      lifecycleStage: "receipt" as const,
      requestId: "req_shared",
      receiptId: "dr_shared",
      correlationId: "cred:shared",
    };
    expect(await recordIntegrationEventOnce({ ...shared, partnerId: "tenant-a", applicationId: "app-a" })).toBe(true);
    expect(await recordIntegrationEventOnce({ ...shared, partnerId: "tenant-b", applicationId: "app-b" })).toBe(true);
    expect(
      await recordIntegrationEventOnce({
        ...shared,
        partnerId: "tenant-a",
        applicationId: "app-a",
        environment: "production",
      }),
    ).toBe(true);
    expect(listIntegrationEventsForTests()).toHaveLength(3);
  });

  it("dedupes idempotent recovery retries for the same authorization binding", async () => {
    const input = {
      partnerId: "institutional-rp-example",
      applicationId: "11111111-1111-1111-1111-111111111111",
      environment: "sandbox" as const,
      eventType: "receipt_issued" as const,
      lifecycleStage: "receipt" as const,
      requestId: "req_recovery",
      receiptId: "dr_recovery",
      correlationId: "cred:recovery",
    };
    expect(await recordIntegrationEventOnce(input)).toBe(true);
    expect(await recordIntegrationEventOnce(input)).toBe(false);
    expect(listIntegrationEventsForTests()).toHaveLength(1);
  });
});
