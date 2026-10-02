// FILE: lib/gtm/acquisitionRoute.test.ts

import { describe, expect, it, beforeEach } from "vitest";
import { POST } from "@/app/api/gtm/acquisition/route";
import {
  listGtmAcquisitionEventsForTests,
  resetGtmAcquisitionEventsForTests,
} from "./acquisitionStore";

describe("gtm acquisition route", () => {
  beforeEach(() => {
    resetGtmAcquisitionEventsForTests();
  });

  it("records sanitized discovery events", async () => {
    const res = await POST(
      new Request("http://localhost/api/gtm/acquisition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "discovery_completed",
          attributes: {
            industry_category: "fintech_digital_assets",
            app_count_band: "2_3",
            has_kyc_vendor: "yes",
            primary_pain: "repeat_verification",
            email: "blocked@example.com",
          },
        }),
      }),
    );
    expect(res.status).toBe(200);
    const events = listGtmAcquisitionEventsForTests();
    expect(events).toHaveLength(1);
    expect(events[0]?.attributes.email).toBeUndefined();
    expect(events[0]?.attributes.industry_category).toBe("fintech_digital_assets");
  });

  it("rejects invalid event types", async () => {
    const res = await POST(
      new Request("http://localhost/api/gtm/acquisition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: "not_real" }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
