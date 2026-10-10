// FILE: lib/partner/hospitality/hospitalityPortabilityProof.test.ts

import { describe, expect, it } from "vitest";
import { runHospitalityPortabilityProof } from "@/lib/partner/hospitality/hospitalityPortabilityProof";
import {
  CIELO_SUNRISE_RENTAL_TENANT,
  SYNTHETIC_RENTAL_OPERATOR_B,
} from "@/lib/partner/hospitality/rentalOperatorTenants";

describe("hospitality rental operator portability", () => {
  it("proves synthetic tenant B uses distinct partner and policy ids from Cielo", () => {
    expect(SYNTHETIC_RENTAL_OPERATOR_B.partnerId).not.toBe(CIELO_SUNRISE_RENTAL_TENANT.partnerId);
    expect(SYNTHETIC_RENTAL_OPERATOR_B.policyId).not.toBe(CIELO_SUNRISE_RENTAL_TENANT.policyId);
  });

  it("passes automated contract proof for both tenants with cross-tenant receipt rejection", () => {
    const result = runHospitalityPortabilityProof();
    expect(result.allPassed).toBe(true);
    expect(result.tenant_isolation.cielo_receipt_rejected_for_synthetic_b).toBe(true);
    expect(result.tenant_isolation.synthetic_b_receipt_rejected_for_cielo).toBe(true);
    expect(result.tenant_isolation.expired_rejected_for_both).toBe(true);
  });
});
