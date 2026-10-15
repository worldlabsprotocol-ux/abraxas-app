// FILE: lib/passport/reusableCredential/resolveInstitutionalIntegrationApplication.test.ts

import { beforeEach, describe, expect, it } from "vitest";
import {
  recordIntegrationEvent,
  resetIntegrationEventsForTests,
} from "@/lib/partner/integrationObservability/record";
import { resolveInstitutionalIntegrationApplicationId } from "./resolveInstitutionalIntegrationApplication";

describe("resolveInstitutionalIntegrationApplicationId", () => {
  beforeEach(() => {
    resetIntegrationEventsForTests();
  });

  it("prefers verification_request_created attribution for the request id", async () => {
    await recordIntegrationEvent({
      partnerId: "institutional-rp-example",
      applicationId: "22222222-2222-2222-2222-222222222222",
      environment: "sandbox",
      eventType: "verification_request_created",
      lifecycleStage: "request",
      requestId: "req_authoritative",
    });
    const resolved = await resolveInstitutionalIntegrationApplicationId({
      partnerId: "institutional-rp-example",
      policyId: "institutional-age-21-v1",
      environment: "sandbox",
      requestId: "req_authoritative",
    });
    expect(resolved).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("returns null when no authoritative attribution exists", async () => {
    const resolved = await resolveInstitutionalIntegrationApplicationId({
      partnerId: "institutional-rp-example",
      policyId: "institutional-age-21-v1",
      environment: "sandbox",
      requestId: "req_unattributed",
    });
    expect(resolved).toBeNull();
  });
});
