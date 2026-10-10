import { describe, expect, it } from "vitest";
import {
  EXAMPLE_MERCHANT_DISCLOSED_RESULT,
  EXAMPLE_MERCHANT_POLICY_PACK_ID,
  validateExampleMerchantPolicyBinding,
} from "./exampleMerchantStagingProfile";

describe("Example Merchant staging profile", () => {
  it("requires age_21_retail pack and age_eligible_21 disclosure", () => {
    expect(EXAMPLE_MERCHANT_POLICY_PACK_ID).toBe("age_21_retail");
    expect(EXAMPLE_MERCHANT_DISCLOSED_RESULT).toBe("age_eligible_21");
    expect(validateExampleMerchantPolicyBinding({
      policyTemplateId: "age_21_retail",
      disclosedResult: "age_eligible_21",
    }).ok).toBe(true);
    expect(validateExampleMerchantPolicyBinding({
      policyTemplateId: "wallet_control",
    }).ok).toBe(false);
  });
});
