// FILE: lib/assurance/ageProviders/adapters/stubProvider.ts
// Placeholder adapters — never production-capable; env vars do not enable authority.

import type { AgeAssuranceProvider } from "../types";
import { PLACEHOLDER_CALLBACK_FAIL_CLOSED } from "../providerAuthority";

function buildPlaceholderAdapter(config: {
  id: string;
  displayName: string;
  assuranceLevel: string;
  capabilities: AgeAssuranceProvider["capabilities"];
}): AgeAssuranceProvider {
  return {
    id: config.id,
    displayName: config.displayName,
    assuranceLevel: config.assuranceLevel,
    capabilities: config.capabilities,
    isProductionCapable() {
      return false;
    },
    isConfigured() {
      // Placeholders are never configured for holder-facing or callback authority.
      return false;
    },
    async createSession() {
      throw new Error("placeholder_provider_not_authoritative");
    },
    async verifyCallback() {
      return { ...PLACEHOLDER_CALLBACK_FAIL_CLOSED, assuranceLevel: config.assuranceLevel };
    },
  };
}

export const digitalWalletAgeProvider = buildPlaceholderAdapter({
  id: "digital_wallet_age",
  displayName: "Digital wallet age proof",
  assuranceLevel: "L3",
  capabilities: {
    over18: true,
    over21: true,
    exactDobReturned: false,
    documentUploadRequired: false,
    biometricRequired: false,
  },
});

export const verifiedEmailAgeProvider = buildPlaceholderAdapter({
  id: "verified_email_age",
  displayName: "Verified email age assurance",
  assuranceLevel: "L2",
  capabilities: {
    over18: true,
    over21: true,
    exactDobReturned: false,
    documentUploadRequired: false,
    biometricRequired: false,
  },
});

export const paymentCardAgeProvider = buildPlaceholderAdapter({
  id: "payment_card_age",
  displayName: "Payment card age assurance",
  assuranceLevel: "L2",
  capabilities: {
    over18: true,
    over21: true,
    exactDobReturned: false,
    documentUploadRequired: false,
    biometricRequired: false,
  },
});
