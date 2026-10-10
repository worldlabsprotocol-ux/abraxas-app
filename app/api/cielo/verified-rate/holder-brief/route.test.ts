// FILE: app/api/cielo/verified-rate/holder-brief/route.test.ts

import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/cielo/verified-rate/holder-brief/route";

describe("Cielo holder brief route", () => {
  it("returns operator, purpose, and age disclosure without PII fields", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json() as {
      brief: { requestor: string; purpose: string; shared_result_category: string };
      policy_id: string;
      policy_pack_id: string;
      booking_boundary: string;
    };
    expect(body.brief.requestor).toContain("Cielo");
    expect(body.policy_id).toBe("cielo-verified-guest-v1");
    expect(body.policy_pack_id).toBe("age_21_retail");
    expect(body.brief.shared_result_category).toBe("age_eligible_21");
    expect(body.booking_boundary.toLowerCase()).toContain("booking");
    expect(body.brief.withheld.length).toBeGreaterThan(0);
    expect(body.brief.result).not.toMatch(/@/);
  });
});
