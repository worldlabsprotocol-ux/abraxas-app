// FILE: lib/passport/reusableCredential/institutionalPresentationObservability.test.ts

import { beforeEach, describe, expect, it } from "vitest";
import { recordInstitutionalPresentationIssuanceTelemetry } from "./institutionalPresentationObservability";
import {
  listIntegrationEventsForTests,
  resetIntegrationEventsForTests,
} from "@/lib/partner/integrationObservability/record";

describe("institutional presentation observability", () => {
  beforeEach(() => {
    resetIntegrationEventsForTests();
  });

  it("records holder consent and receipt issued without prohibited fields", async () => {
    await recordInstitutionalPresentationIssuanceTelemetry({
      partnerId: "institutional-rp-example",
      policyId: "institutional-age-21-v1",
      policyVersion: 1,
      environment: "sandbox",
      requestId: "req_obs_582",
      receiptId: "dr_obs_582",
    });
    const events = listIntegrationEventsForTests();
    expect(events.map((e) => e.event_type).sort()).toEqual(["holder_flow_completed", "receipt_issued"]);
    const blob = JSON.stringify(events).toLowerCase();
    expect(blob).not.toMatch(/date_of_birth|legal_name|passport|wallet_address/);
  });
});
