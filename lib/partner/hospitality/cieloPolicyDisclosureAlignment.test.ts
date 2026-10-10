// FILE: lib/partner/hospitality/cieloPolicyDisclosureAlignment.test.ts

import { describe, expect, it } from "vitest";
import { describeCieloPolicyDisclosureAlignment } from "@/lib/partner/hospitality/cieloPolicyDisclosureAlignment";

describe("Cielo policy disclosure alignment", () => {
  it("documents non-equivalence with age_21_retail after Build #503 fix", () => {
    const d = describeCieloPolicyDisclosureAlignment();
    expect(d.pinned_policy_id).toBe("cielo-verified-guest-v1");
    expect(d.policies_equivalent).toBe(false);
    expect(d.cielo_disclosed_result).toBe("verified_guest_pilot_pass");
    expect(d.age_21_retail_disclosed_result).toBe("age_eligible_21");
    expect(d.holder_disclosure_source).toBe("cielo_verified_guest_v1_contract");
  });
});
