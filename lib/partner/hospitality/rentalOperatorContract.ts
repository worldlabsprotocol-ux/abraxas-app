// FILE: lib/partner/hospitality/rentalOperatorContract.ts
// Reusable private guest-eligibility contract for independent rental operators (not a trust engine fork).

import { POLICY_PACKS, type PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import type { PartnerIntegrationConfig } from "@/lib/partner/referenceIntegration";

/** Narrow pilot: age eligibility only when operator policy pack is age_21_retail. */
export const RENTAL_OPERATOR_DEFAULT_POLICY_PACK_ID: PolicyPackId = "age_21_retail";

export type RentalOperatorLegacyClassification =
  | "REUSE"
  | "ADAPT"
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
  policyPackId: PolicyPackId;
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

export const CIELO_LEGACY_MODERN_COMPONENT_MAP: ReadonlyArray<{
  component: string;
  classification: RentalOperatorLegacyClassification;
  modern_anchor: string;
  notes: string;
}> = [
  {
    component: "issueReceiptForDecision / trustEvaluation",
    classification: "REUSE",
    modern_anchor: "lib/decisionReceipts/service",
    notes: "Cielo consent path already issues modern signed receipts.",
  },
  {
    component: "verifiedRateService + cielo_verified_rate_requests",
    classification: "ADAPT",
    modern_anchor: "rentalOperatorContract tenant config",
    notes: "First-party adapter; same tables readable after modernization.",
  },
  {
    component: "evaluateCieloVerifiedGuest",
    classification: "ADAPT",
    modern_anchor: "evaluatePolicyRules + policy pack age_21_retail",
    notes: "Extra wallet/profile gates; align disclosure with pack, do not fork trust engine.",
  },
  {
    component: "CieloVerifiedRateFlow UI",
    classification: "ADAPT",
    modern_anchor: "holderExperience brief + Passport hosted paths",
    notes: "Surface operator, purpose, policy, consent; no booking implication.",
  },
  {
    component: "Partner Flow evaluate URL",
    classification: "REUSE",
    modern_anchor: "buildPartnerVerifyUrl / hosted holder",
    notes: "Optional for non-Cielo rental operators without custom property UI.",
  },
  {
    component: "Launchpad provisioning + sandbox keys",
    classification: "REUSE",
    modern_anchor: "Launchpad applications, allowed callbacks",
    notes: "Each rental operator is tenant-scoped application + pinned policy.",
  },
  {
    component: "partner_integration_events",
    classification: "REUSE",
    modern_anchor: "recordIntegrationEventBestEffort",
    notes: "Funnel metrics; not Airbnb occupancy/revenue.",
  },
  {
    component: "USDC treasury / stay_requests / cielo pay",
    classification: "RETAIN_SEPARATELY",
    modern_anchor: "lib/cielo/treasury.ts",
    notes: "Out of scope for hospitality eligibility pilot; no removal in #502.",
  },
  {
    component: "CIELO_VERIFIED_RATE_FIXTURE query param",
    classification: "DEPRECATE_LATER",
    modern_anchor: "staging activation gates",
    notes: "UI dev only; forbidden for staging proof.",
  },
  {
    component: "Parallel Cielo-only receipt issuer",
    classification: "REMOVE_ONLY_WITH_APPROVAL",
    modern_anchor: "n/a — never add",
    notes: "Would regress tenant binding and validity stack.",
  },
];
