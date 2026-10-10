// FILE: lib/partner/hospitality/rentalOperatorTenants.ts
// Tenant configs: Cielo pilot + synthetic second operator (contract proof only).

import {
  RENTAL_OPERATOR_DEFAULT_POLICY_PACK_ID,
  type RentalOperatorTenantConfig,
} from "@/lib/partner/hospitality/rentalOperatorContract";
import {
  CIELO_PARTNER_ID,
  CIELO_VERIFIED_GUEST_POLICY_ID,
} from "@/lib/cielo/cieloIds";
import { CIELO_AIRBNB_URL } from "@/lib/data/flagshipProperty";

/** First-party hospitality pilot — real property, not a fictional merchant. */
export const CIELO_SUNRISE_RENTAL_TENANT: RentalOperatorTenantConfig = {
  partnerId: CIELO_PARTNER_ID,
  policyId: CIELO_VERIFIED_GUEST_POLICY_ID,
  displayName: "Cielo Sunrise",
  policyPackId: RENTAL_OPERATOR_DEFAULT_POLICY_PACK_ID,
  integrationSurface: "first_party_property_ui",
  externalBookingUrl: CIELO_AIRBNB_URL,
  launchpadApplicationIdEnvKey: "CIELO_LAUNCHPAD_APPLICATION_ID",
  consentPurpose: "cielo_verified_rate",
  propertySlug: "cielo-sunrise",
};

/**
 * Synthetic tenant B — offline/portable proof only. Not a live commercial customer.
 * Policy id is a placeholder matching Launchpad pinning conventions.
 */
export const SYNTHETIC_RENTAL_OPERATOR_B: RentalOperatorTenantConfig = {
  partnerId: "rental-synthetic-operator-b",
  policyId: "rental-synthetic-operator-b-age21-v1",
  displayName: "Synthetic Rental Operator B",
  policyPackId: RENTAL_OPERATOR_DEFAULT_POLICY_PACK_ID,
  integrationSurface: "hosted_partner_flow",
  externalBookingUrl: "https://example.test/listing/synthetic-b",
  launchpadApplicationIdEnvKey: "RENTAL_SYNTHETIC_B_LAUNCHPAD_APPLICATION_ID",
  consentPurpose: "rental_verified_guest_request",
  propertySlug: null,
};

export const HOSPITALITY_PILOT_TENANTS = [
  CIELO_SUNRISE_RENTAL_TENANT,
  SYNTHETIC_RENTAL_OPERATOR_B,
] as const;
