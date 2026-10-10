// FILE: app/api/cielo/verified-rate/holder-brief/route.test.ts

import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/cielo/verified-rate/holder-brief/route";

describe("Cielo holder brief route", () => {
  it("discloses cielo-verified-guest-v1 predicates (not age_21_retail)", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json() as {
      brief: { requestor: string; purpose: string; shared_result_category: string };
      policy_id: string;
      disclosed_result: string;
      equivalent_to_age_21_retail: boolean;
      predicates: { minimum_age: number | null; required_claim_types: string[] };
      booking_boundary: string;
    };
    expect(body.brief.requestor).toContain("Cielo");
    expect(body.policy_id).toBe("cielo-verified-guest-v1");
    expect(body.disclosed_result).toBe("verified_guest_pilot_pass");
    expect(body.equivalent_to_age_21_retail).toBe(false);
    expect(body.predicates.minimum_age).toBeNull();
    expect(body.predicates.required_claim_types).toContain("wallet_binding_confirmed");
    expect(body.brief.shared_result_category).toBe("verified_guest_pilot_pass");
    expect(body.booking_boundary.toLowerCase()).toContain("booking");
    expect(body.brief.purpose.toLowerCase()).toContain("not a 21+ age certificate");
  });
});
