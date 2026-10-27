import { describe, expect, it } from "vitest";
import {
  assertAuthoritativeProvisionBinding,
  clientPolicyIdOverrideRejected,
  resolveStudioPolicyTemplateId,
} from "@/lib/partner/integrationStudio/provisionPolicyAuthority";
import { buildLaunchpadPolicyId } from "@/lib/partner/launchpad/policyCatalog";

describe("provisionPolicyAuthority", () => {
  it("resolves a single template and rejects conflicting pack_id", () => {
    expect(resolveStudioPolicyTemplateId({ policy_template_id: "age_21_retail" })).toBe("age_21_retail");
    expect(
      resolveStudioPolicyTemplateId({
        policy_template_id: "age_21_retail",
        pack_id: "wallet_control",
      }),
    ).toBeNull();
  });

  it("rejects client policy_id overrides", () => {
    const partnerId = "acme";
    const template = "wallet_control";
    const expected = buildLaunchpadPolicyId(partnerId, template);
    expect(clientPolicyIdOverrideRejected({ policy_id: "other-policy" }, partnerId, template)).toBe(true);
    expect(clientPolicyIdOverrideRejected({ policy_id: expected }, partnerId, template)).toBe(false);
    expect(clientPolicyIdOverrideRejected({}, partnerId, template)).toBe(false);
  });

  it("asserts tenant and catalog-derived policy pin after provision", () => {
    const partnerId = "acme";
    const template = "wallet_control";
    const policyId = buildLaunchpadPolicyId(partnerId, template);
    expect(
      assertAuthoritativeProvisionBinding({
        partnerId,
        policyTemplateId: template,
        provisionedPartnerId: partnerId,
        provisionedPolicyId: policyId,
      }),
    ).toBe(true);
    expect(
      assertAuthoritativeProvisionBinding({
        partnerId,
        policyTemplateId: template,
        provisionedPartnerId: "other",
        provisionedPolicyId: policyId,
      }),
    ).toBe(false);
    expect(
      assertAuthoritativeProvisionBinding({
        partnerId,
        policyTemplateId: template,
        provisionedPartnerId: partnerId,
        provisionedPolicyId: "wrong-pin",
      }),
    ).toBe(false);
  });
});
