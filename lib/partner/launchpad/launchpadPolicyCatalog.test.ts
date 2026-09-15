// FILE: lib/partner/launchpad/launchpadPolicyCatalog.test.ts

import { describe, expect, it } from "vitest";
import {
  LAUNCHPAD_POLICY_TEMPLATE_LIST,
  buildLaunchpadPolicyId,
  resolveLaunchpadPolicyTemplate,
} from "@/lib/partner/launchpad/policyCatalog";

describe("launchpad policy catalog", () => {
  it("exposes predefined templates only", () => {
    expect(LAUNCHPAD_POLICY_TEMPLATE_LIST.length).toBeGreaterThanOrEqual(4);
    for (const template of LAUNCHPAD_POLICY_TEMPLATE_LIST) {
      expect(template.rules).toBeTruthy();
      expect(template.userExplanation.length).toBeGreaterThan(10);
      expect(template.receiptLifetimeHours).toBeGreaterThan(0);
    }
  });

  it("builds stable versioned policy ids", () => {
    expect(buildLaunchpadPolicyId("acme", "age_21_retail")).toBe("acme-age_21_retail-v1");
  });

  it("rejects unknown template ids", () => {
    expect(resolveLaunchpadPolicyTemplate("executable_partner_code")).toBeNull();
    expect(resolveLaunchpadPolicyTemplate("age_21_retail")?.rules.minimum_age).toBe(21);
  });
});
