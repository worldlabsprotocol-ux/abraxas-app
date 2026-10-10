// FILE: lib/partner/hospitality/cieloPolicyDisclosureAlignment.test.ts

import { describe, expect, it } from "vitest";
import { describeCieloPolicyDisclosureAlignment } from "@/lib/partner/hospitality/cieloPolicyDisclosureAlignment";

describe("Cielo policy disclosure alignment", () => {
  it("keeps pinned policy id separate from Launchpad pack disclosure", () => {
    const d = describeCieloPolicyDisclosureAlignment();
    expect(d.pinned_policy_id).toBe("cielo-verified-guest-v1");
    expect(d.disclosure_policy_pack_id).toBe("age_21_retail");
    expect(d.disclosed_result).toBe("age_eligible_21");
    expect(d.immutable_policy_note).toMatch(/version/i);
  });
});
