// FILE: lib/partner/partnerCommercialPlans.test.ts

import { describe, expect, it } from "vitest";
import {
  estimatePartnerCommercialUsage,
  resolvePartnerCommercialPlan,
} from "./partnerCommercialPlans";

describe("partner commercial plans", () => {
  it("keeps sandbox free and estimate-only", () => {
    const estimate = estimatePartnerCommercialUsage({
      planId: "observe",
      approvedReceipts: 50_000,
      authenticatedApiCalls: 5_000_000,
    });
    expect(estimate.plan_id).toBe("sandbox");
    expect(estimate.estimated_total_cents).toBe(0);
    expect(estimate.estimate_only).toBe(true);
    expect(estimate.collection_status).toBe("not_enabled");
  });

  it("prices Launch usage from existing receipt and API meters", () => {
    const estimate = estimatePartnerCommercialUsage({
      planId: "launch",
      approvedReceipts: 3_000,
      authenticatedApiCalls: 102_001,
    });
    expect(estimate.overage.approved_receipts).toBe(500);
    expect(estimate.overage.authenticated_api_call_blocks).toBe(3);
    expect(estimate.estimated_receipt_overage_cents).toBe(2_500);
    expect(estimate.estimated_api_overage_cents).toBe(300);
    expect(estimate.estimated_total_cents).toBe(12_700);
    expect(estimate.collection_status).toBe("solana_usdc_available");
  });

  it("uses lower Scale overages and rounds API usage by one-thousand-call blocks", () => {
    const estimate = estimatePartnerCommercialUsage({
      planId: "scale",
      approvedReceipts: 25_001,
      authenticatedApiCalls: 1_000_001,
    });
    expect(estimate.estimated_receipt_overage_cents).toBe(3);
    expect(estimate.estimated_api_overage_cents).toBe(50);
    expect(estimate.estimated_total_cents).toBe(49_953);
  });

  it("leaves enterprise pricing contractual", () => {
    const estimate = estimatePartnerCommercialUsage({
      planId: "enterprise",
      approvedReceipts: 1_000_000,
      authenticatedApiCalls: 10_000_000,
    });
    expect(estimate.estimated_total_cents).toBeNull();
  });

  it("fails unknown plans closed to the free sandbox contract", () => {
    expect(resolvePartnerCommercialPlan("unknown").id).toBe("sandbox");
  });
});
