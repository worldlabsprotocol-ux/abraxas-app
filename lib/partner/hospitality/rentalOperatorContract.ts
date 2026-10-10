// FILE: lib/partner/hospitality/rentalOperatorContract.ts
// Reusable private guest-eligibility contract for independent rental operators (not a trust engine fork).

import { POLICY_PACKS, type PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import type { PartnerIntegrationConfig } from "@/lib/partner/referenceIntegration";

/** Narrow pilot: age eligibility only when operator policy pack is age_21_retail. */
export const RENTAL_OPERATOR_DEFAULT_POLICY_PACK_ID: PolicyPackId = "age_21_retail";

export type RentalOperatorLegacyClassification =
  | "REUSE"
  | "ADAPT"
  | "ISOLATE_AS_LEGACY"
  | "DEPRECATE_LATER"
  | "RETAIN_SEPARATELY"
  | "REMOVE_ONLY_WITH_APPROVAL";

export type RentalOperatorIntegrationSurface =
  | "first_party_property_ui"
  | "hosted_partner_flow";

export interface RentalOperatorTenantConfig {
  /** Stable partner_id row in partners / Launchpad. */
  partnerId: string;
  /** Pinned partner_policies.policy_id (versioned). */
  policyId: string;
  displayName: string;
  /** Null when tenant uses a pinned partner policy only (e.g. cielo-verified-guest-v1). */
  policyPackId: PolicyPackId | null;
  integrationSurface: RentalOperatorIntegrationSurface;
  /** External OTA/booking channel URL — Abraxas does not control checkout. */
  externalBookingUrl?: string | null;
  /** Env var holding Launchpad application UUID for partner_integration_events. */
  launchpadApplicationIdEnvKey: string;
  /** Human purpose string stored on consent / shown to holder. */
  consentPurpose: string;
  /** Optional property slug for first-party UI routes (Cielo only today). */
  propertySlug?: string | null;
}

export function getRentalOperatorPolicyPack(packId: PolicyPackId = RENTAL_OPERATOR_DEFAULT_POLICY_PACK_ID) {
  return POLICY_PACKS[packId];
}

export function validateRentalOperatorPolicyBinding(input: {
  policyPackId: PolicyPackId;
  disclosedResult?: string | null;
}): { ok: true } | { ok: false; errors: string[] } {
  const pack = POLICY_PACKS[input.policyPackId];
  const errors: string[] = [];
  if (!pack) {
    errors.push("unknown_policy_pack");
  }
  if (input.disclosedResult && pack && input.disclosedResult !== pack.disclosed_result) {
    errors.push(`disclosed_result_must_be_${pack.disclosed_result}`);
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function rentalOperatorHolderPurpose(tenant: RentalOperatorTenantConfig): string {
  if (!tenant.policyPackId) {
    return "Confirm eligibility under the operator's pinned Abraxas policy. "
      + "This is not booking confirmation, availability, or payment.";
  }
  const pack = POLICY_PACKS[tenant.policyPackId];
  return (
    pack.holder_explanation
    + " This is guest eligibility for the requesting operator only — not booking confirmation, availability, or payment."
  );
}

export function rentalOperatorPartnerIntegrationConfig(
  tenant: RentalOperatorTenantConfig,
  enterPath: string,
): PartnerIntegrationConfig {
  return {
    partnerId: tenant.partnerId,
    policyId: tenant.policyId,
    enterPath,
    displayName: tenant.displayName,
  };
}

export const RENTAL_OPERATOR_BOOKING_BOUNDARY =
  "Verified guest eligibility is separate from approved booking status. Abraxas does not confirm reservations on external channels.";

export type CieloModernizationComponentRow = {
  component: string;
  path: string;
  classification: RentalOperatorLegacyClassification;
  modern_anchor: string;
  historical_readable: boolean;
  notes: string;
};

export const CIELO_LEGACY_MODERN_COMPONENT_MAP: ReadonlyArray<CieloModernizationComponentRow> = [
  {
    component: "Signed decision receipts",
    path: "lib/decisionReceipts/service.ts → issueReceiptForDecision",
    classification: "REUSE",
    modern_anchor: "trustEvaluation / verifyPartnerFlowReceipt",
    historical_readable: true,
    notes: "Cielo consent already uses canonical issuance; no parallel issuer.",
  },
  {
    component: "Verified-rate adapter",
    path: "lib/cielo/verifiedRateService.ts",
    classification: "ADAPT",
    modern_anchor: "RentalOperatorTenantConfig + Launchpad app binding",
    historical_readable: true,
    notes: "Property-specific submit/queue; trust path is shared.",
  },
  {
    component: "Guest policy evaluation",
    path: "lib/cielo/verifiedGuestPolicy.ts",
    classification: "ADAPT",
    modern_anchor: "evaluatePolicyRules + getPolicy(cielo-verified-guest-v1)",
    historical_readable: true,
    notes: "Immutable DB policy; extra profile/wallet gates. Disclosure uses age_21_retail pack for holder UX only until a versioned successor is operator-approved.",
  },
  {
    component: "Policy row cielo-verified-guest-v1",
    path: "supabase/migrations/026_cielo_verified_rate.sql, 032_reconcile…",
    classification: "ISOLATE_AS_LEGACY",
    modern_anchor: "Launchpad policy packs (age_21_retail template for new operators)",
    historical_readable: true,
    notes: "Do not silently mutate rules_json. New operators pin new policy_id versions via Launchpad.",
  },
  {
    component: "Holder UI",
    path: "app/cielo/verified-rate, components/cielo/CieloVerifiedRateFlow.tsx",
    classification: "ADAPT",
    modern_anchor: "holderExperience/brief, Passport / hosted partner flow",
    historical_readable: true,
    notes: "First-party reference UI; other operators may use hosted evaluate only.",
  },
  {
    component: "Property / genesis asset surface",
    path: "app/flagship, ABX-RE-HOSP-001",
    classification: "REUSE",
    modern_anchor: "FlagshipAssetPage + external OTA link",
    historical_readable: true,
    notes: "Asset provenance ≠ guest eligibility.",
  },
  {
    component: "Operator review queue",
    path: "app/admin/cielo, cielo_verified_rate_requests",
    classification: "ADAPT",
    modern_anchor: "Merchant decision separate from Abraxas receipt validity",
    historical_readable: true,
    notes: "Operator approval is not booking confirmation.",
  },
  {
    component: "Hosted Partner Flow",
    path: "lib/partner/referenceIntegration, /partner/verify",
    classification: "REUSE",
    modern_anchor: "buildPartnerVerifyUrl",
    historical_readable: true,
    notes: "Default path for synthetic operator B and future rental tenants.",
  },
  {
    component: "Launchpad / Integration Studio",
    path: "lib/partner/launchpad/*",
    classification: "REUSE",
    modern_anchor: "Applications, callbacks, sandbox keys, production activation",
    historical_readable: true,
    notes: "Cielo gets no automatic production bypass.",
  },
  {
    component: "Integration observability",
    path: "lib/partner/integrationObservability/*",
    classification: "REUSE",
    modern_anchor: "partner_integration_events via recordRentalOperatorFunnelEvent",
    historical_readable: true,
    notes: "Synthetic vs staging vs production attribution via environment field.",
  },
  {
    component: "USDC booking / treasury",
    path: "lib/cielo/treasury.ts, /cielo/pay",
    classification: "RETAIN_SEPARATELY",
    modern_anchor: "Not eligibility infrastructure",
    historical_readable: true,
    notes: "ISOLATE from modernization; no auto-activation in staging harness.",
  },
  {
    component: "Fixture query param",
    path: "lib/cielo/verifiedRateFixtures.ts",
    classification: "DEPRECATE_LATER",
    modern_anchor: "cielo:staging-activate gates",
    historical_readable: true,
    notes: "Forbidden for staging proof.",
  },
  {
    component: "Parallel Cielo receipt issuer",
    path: "n/a",
    classification: "REMOVE_ONLY_WITH_APPROVAL",
    modern_anchor: "Forbidden",
    historical_readable: false,
    notes: "Would break tenant binding and validity.",
  },
];
