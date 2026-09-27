// FILE: lib/partner/partnerCommercialPlans.ts
// Commercial plan contract over the existing PII-free metering ledger.
// Estimates never charge, block, or mutate partner access.

export type PartnerCommercialPlanId = "sandbox" | "launch" | "scale" | "enterprise";

export interface PartnerCommercialPlan {
  id: PartnerCommercialPlanId;
  label: string;
  monthly_base_cents: number | null;
  included_receipts: number | null;
  included_api_calls: number | null;
  receipt_overage_cents: number | null;
  api_overage_per_thousand_cents: number | null;
}

export interface PartnerCommercialEstimate {
  plan_id: PartnerCommercialPlanId;
  plan_label: string;
  currency: "USD";
  estimate_only: true;
  collection_status: "not_enabled";
  usage: {
    approved_receipts: number;
    authenticated_api_calls: number;
  };
  included: {
    approved_receipts: number | null;
    authenticated_api_calls: number | null;
  };
  overage: {
    approved_receipts: number;
    authenticated_api_calls: number;
    authenticated_api_call_blocks: number;
  };
  estimated_base_cents: number | null;
  estimated_receipt_overage_cents: number | null;
  estimated_api_overage_cents: number | null;
  estimated_total_cents: number | null;
}

export const PARTNER_COMMERCIAL_PLANS: Record<PartnerCommercialPlanId, PartnerCommercialPlan> = {
  sandbox: {
    id: "sandbox",
    label: "Sandbox",
    monthly_base_cents: 0,
    included_receipts: null,
    included_api_calls: null,
    receipt_overage_cents: null,
    api_overage_per_thousand_cents: null,
  },
  launch: {
    id: "launch",
    label: "Launch",
    monthly_base_cents: 9_900,
    included_receipts: 2_500,
    included_api_calls: 100_000,
    receipt_overage_cents: 5,
    api_overage_per_thousand_cents: 100,
  },
  scale: {
    id: "scale",
    label: "Scale",
    monthly_base_cents: 49_900,
    included_receipts: 25_000,
    included_api_calls: 1_000_000,
    receipt_overage_cents: 3,
    api_overage_per_thousand_cents: 50,
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    monthly_base_cents: null,
    included_receipts: null,
    included_api_calls: null,
    receipt_overage_cents: null,
    api_overage_per_thousand_cents: null,
  },
};

export function resolvePartnerCommercialPlan(planId: string): PartnerCommercialPlan {
  const normalized = planId.trim().toLowerCase();
  if (normalized === "launch" || normalized === "scale" || normalized === "enterprise") {
    return PARTNER_COMMERCIAL_PLANS[normalized];
  }
  return PARTNER_COMMERCIAL_PLANS.sandbox;
}

export function estimatePartnerCommercialUsage(input: {
  planId: string;
  approvedReceipts: number;
  authenticatedApiCalls: number;
}): PartnerCommercialEstimate {
  const plan = resolvePartnerCommercialPlan(input.planId);
  const approvedReceipts = Math.max(0, Math.floor(input.approvedReceipts));
  const authenticatedApiCalls = Math.max(0, Math.floor(input.authenticatedApiCalls));

  const receiptOverage = plan.included_receipts == null
    ? 0
    : Math.max(0, approvedReceipts - plan.included_receipts);
  const apiOverage = plan.included_api_calls == null
    ? 0
    : Math.max(0, authenticatedApiCalls - plan.included_api_calls);
  const apiBlocks = apiOverage === 0 ? 0 : Math.ceil(apiOverage / 1_000);

  const receiptOverageCents = plan.receipt_overage_cents == null
    ? null
    : receiptOverage * plan.receipt_overage_cents;
  const apiOverageCents = plan.api_overage_per_thousand_cents == null
    ? null
    : apiBlocks * plan.api_overage_per_thousand_cents;
  const total = plan.monthly_base_cents == null
    || receiptOverageCents == null
    || apiOverageCents == null
      ? null
      : plan.monthly_base_cents + receiptOverageCents + apiOverageCents;

  return {
    plan_id: plan.id,
    plan_label: plan.label,
    currency: "USD",
    estimate_only: true,
    collection_status: "not_enabled",
    usage: {
      approved_receipts: approvedReceipts,
      authenticated_api_calls: authenticatedApiCalls,
    },
    included: {
      approved_receipts: plan.included_receipts,
      authenticated_api_calls: plan.included_api_calls,
    },
    overage: {
      approved_receipts: receiptOverage,
      authenticated_api_calls: apiOverage,
      authenticated_api_call_blocks: apiBlocks,
    },
    estimated_base_cents: plan.monthly_base_cents,
    estimated_receipt_overage_cents: receiptOverageCents,
    estimated_api_overage_cents: apiOverageCents,
    estimated_total_cents: total,
  };
}
