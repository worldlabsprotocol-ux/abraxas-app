// FILE: lib/product/publicPricingCopy.ts
// Public pricing copy derived from partnerCommercialPlans — no invented amounts.

import {
  PARTNER_COMMERCIAL_PLANS,
  type PartnerCommercialPlan,
  type PartnerCommercialPlanId,
} from "@/lib/partner/partnerCommercialPlans";
import { INTEGRATION_STUDIO_PATH } from "@/lib/partner/integrationStudio/contract";
import { PARTNER_APPLICATION_PATH } from "@/lib/integrate/partnerJourney";

export const PUBLIC_PRICING_PATH = "/pricing" as const;

export const PUBLIC_PRICING_INTEGRATION_STUDIO_HREF = INTEGRATION_STUDIO_PATH;
export const PUBLIC_PRICING_LAUNCHPAD_HREF = "/developers/launchpad" as const;
export const PUBLIC_PRICING_ENTERPRISE_HREF = PARTNER_APPLICATION_PATH;

export const PUBLIC_PRICING_EYEBROW = "Pricing";
export const PUBLIC_PRICING_HEADLINE = "Pay for verification outcomes, not identity data";
export const PUBLIC_PRICING_LEAD =
  "Build and test for free in sandbox. When you go live, production plans bill from approved receipts and authenticated API usage — estimates only today, with no automatic blocking.";

export interface PublicPricingTierFeature {
  text: string;
}

export interface PublicPricingTier {
  id: "sandbox" | "production" | "enterprise";
  title: string;
  priceLabel: string;
  priceDetail: string | null;
  summary: string;
  features: PublicPricingTierFeature[];
  ctaLabel: string;
  ctaHref: string;
  ctaVariant: "primary" | "secondary";
}

export interface PublicProductionPlanDisplay {
  planId: Extract<PartnerCommercialPlanId, "launch" | "scale">;
  label: string;
  monthlyPriceLabel: string;
  includedReceiptsLabel: string;
  includedApiCallsLabel: string;
  receiptOverageLabel: string;
  apiOverageLabel: string;
}

export interface PublicPricingFaqItem {
  question: string;
  answer: string;
}

function formatMonthlyUsd(cents: number | null): string {
  if (cents == null) return "Custom";
  if (cents === 0) return "$0";
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatReceiptOverage(cents: number | null): string {
  if (cents == null) return "Custom";
  return `$${(cents / 100).toFixed(2)} per approved receipt above included volume`;
}

function formatApiOverage(cents: number | null): string {
  if (cents == null) return "Custom";
  return `$${(cents / 100).toFixed(2)} per 1,000 authenticated API calls above included volume`;
}

function formatIncludedCount(value: number | null, unit: string): string {
  if (value == null) return "Custom included volume";
  return `${value.toLocaleString("en-US")} ${unit} included per 30 days`;
}

export function buildPublicProductionPlanDisplay(
  plan: PartnerCommercialPlan,
): PublicProductionPlanDisplay {
  return {
    planId: plan.id as "launch" | "scale",
    label: plan.label,
    monthlyPriceLabel: `${formatMonthlyUsd(plan.monthly_base_cents)}/mo`,
    includedReceiptsLabel: formatIncludedCount(plan.included_receipts, "approved receipts"),
    includedApiCallsLabel: formatIncludedCount(plan.included_api_calls, "authenticated API calls"),
    receiptOverageLabel: formatReceiptOverage(plan.receipt_overage_cents),
    apiOverageLabel: formatApiOverage(plan.api_overage_per_thousand_cents),
  };
}

export const PUBLIC_PRODUCTION_PLAN_DISPLAYS: PublicProductionPlanDisplay[] = [
  buildPublicProductionPlanDisplay(PARTNER_COMMERCIAL_PLANS.launch),
  buildPublicProductionPlanDisplay(PARTNER_COMMERCIAL_PLANS.scale),
];

export const PUBLIC_PRICING_TIERS: PublicPricingTier[] = [
  {
    id: "sandbox",
    title: "Sandbox",
    priceLabel: formatMonthlyUsd(PARTNER_COMMERCIAL_PLANS.sandbox.monthly_base_cents),
    priceDetail: "Free to build and test",
    summary: "For building and testing before any production decision.",
    features: [
      { text: "Create a test application in Integration Studio" },
      { text: "Use sandbox credentials and test policies" },
      { text: "Integrate hosted verification and inspect receipts" },
      { text: "No production credentials or live user decisions" },
    ],
    ctaLabel: "Start building",
    ctaHref: PUBLIC_PRICING_INTEGRATION_STUDIO_HREF,
    ctaVariant: "primary",
  },
  {
    id: "production",
    title: "Production",
    priceLabel: `From ${formatMonthlyUsd(PARTNER_COMMERCIAL_PLANS.launch.monthly_base_cents)}/mo`,
    priceDetail: "Launch and Scale plans · 30-day billing period",
    summary: "For applications verifying real users after readiness review.",
    features: [
      { text: "Billed on approved receipts and authenticated API calls" },
      { text: "Launch and Scale tiers with included volume and overage rates" },
      { text: "Plan payment available via Solana USDC inside Integration Studio" },
      { text: "Production credentials require Launchpad review — not self-serve" },
    ],
    ctaLabel: "Request production access",
    ctaHref: PUBLIC_PRICING_LAUNCHPAD_HREF,
    ctaVariant: "primary",
  },
  {
    id: "enterprise",
    title: "Enterprise",
    priceLabel: "Custom",
    priceDetail: "Contractual pricing",
    summary: "For higher volume, custom policy packs, and operational requirements.",
    features: [
      { text: "Custom included volume and overage terms" },
      { text: "Additional security, support, or SLA requirements" },
      { text: "Dedicated review for complex policy or deployment needs" },
    ],
    ctaLabel: "Contact Abraxas",
    ctaHref: PUBLIC_PRICING_ENTERPRISE_HREF,
    ctaVariant: "secondary",
  },
];

export const PUBLIC_PRICING_FAQ: PublicPricingFaqItem[] = [
  {
    question: "Do end users pay?",
    answer:
      "No. Abraxas pricing is for partners integrating eligibility verification. Holders are not charged through this commercial model.",
  },
  {
    question: "What happens in sandbox?",
    answer:
      "Sandbox is free. Signed-in partners can create an isolated test application, integrate policies, run hosted verification, and inspect receipts. Sandbox artifacts are not production-usable unless your validator explicitly allows them.",
  },
  {
    question: "What counts as billable usage?",
    answer:
      "Production plans meter approved Partner Flow receipts and authenticated partner API calls. Usage estimates are observe-only today — they do not block access or charge automatically.",
  },
  {
    question: "Do you store or sell identity data?",
    answer:
      "Abraxas is designed so partners receive a narrow signed eligibility result instead of collecting underlying identity data. Partners remain responsible for their own compliance and data handling outside Abraxas.",
  },
  {
    question: "Can we use our own policy?",
    answer:
      "Sandbox testing uses provisioned test policies. Production policies and credentials are operator-reviewed through Launchpad — there is no self-serve production portal.",
  },
  {
    question: "What if we need higher volume?",
    answer:
      "Scale covers higher included volume with lower overage rates. For requirements beyond Scale, use Enterprise and contact Abraxas to discuss custom terms.",
  },
];

export function publicPricingAmountsMatchCanonicalPlans(): boolean {
  const launch = PARTNER_COMMERCIAL_PLANS.launch;
  const scale = PARTNER_COMMERCIAL_PLANS.scale;
  const displays = PUBLIC_PRODUCTION_PLAN_DISPLAYS;
  return (
    displays[0]?.monthlyPriceLabel === `${formatMonthlyUsd(launch.monthly_base_cents)}/mo`
    && displays[1]?.monthlyPriceLabel === `${formatMonthlyUsd(scale.monthly_base_cents)}/mo`
    && PUBLIC_PRICING_TIERS[0]?.priceLabel === formatMonthlyUsd(PARTNER_COMMERCIAL_PLANS.sandbox.monthly_base_cents)
    && PUBLIC_PRICING_TIERS[1]?.priceLabel === `From ${formatMonthlyUsd(launch.monthly_base_cents)}/mo`
  );
}
