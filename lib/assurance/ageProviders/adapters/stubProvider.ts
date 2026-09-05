// FILE: lib/assurance/ageProviders/adapters/stubProvider.ts
// Config-gated stub adapters — disabled until operator configures vendor credentials.

import { createHash } from "crypto";
import type { AgeAssuranceProvider } from "../types";

function envFlag(name: string): boolean {
  return process.env[name]?.trim() === "1" || process.env[name]?.trim()?.toLowerCase() === "true";
}

function buildStubAdapter(config: {
  id: string;
  displayName: string;
  assuranceLevel: string;
  enableEnv: string;
  secretEnv: string;
  capabilities: AgeAssuranceProvider["capabilities"];
}): AgeAssuranceProvider {
  return {
    id: config.id,
    displayName: config.displayName,
    assuranceLevel: config.assuranceLevel,
    capabilities: config.capabilities,
    isConfigured() {
      return envFlag(config.enableEnv) && Boolean(process.env[config.secretEnv]?.trim());
    },
    async createSession(input) {
      if (!this.isConfigured()) {
        throw new Error("provider_not_configured");
      }
      const providerSessionId = createHash("sha256")
        .update(`${config.id}:${input.sessionNonce}:${input.subjectRef}`)
        .digest("hex")
        .slice(0, 32);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const redirectUrl = `${process.env.ABRAXAS_ISSUER_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/age-assurance/callback/${config.id}?state=${encodeURIComponent(input.sessionNonce)}&provider_session_id=${providerSessionId}&return_url=${encodeURIComponent(input.returnUrl)}`;
      return { providerSessionId, redirectUrl, expiresAt };
    },
    async verifyCallback(input) {
      if (!this.isConfigured()) {
        return {
          verified: false,
          ageBand: "unknown",
          assuranceLevel: config.assuranceLevel,
          evidenceRefHash: "",
          reasonCode: "provider_not_configured",
        };
      }
      const payload = input.callbackPayload as { simulated_age_band?: string } | null;
      const ageBand = (payload?.simulated_age_band ?? "unknown") as "under_18" | "over_18" | "over_21" | "unknown";
      const verified = ageBand === "over_21" || ageBand === "over_18";
      const evidenceRefHash = createHash("sha256")
        .update(`${config.id}:${input.providerSessionId}:${ageBand}`)
        .digest("hex");
      return {
        verified,
        ageBand,
        assuranceLevel: config.assuranceLevel,
        evidenceRefHash,
        reasonCode: verified ? undefined : "provider_result_insufficient",
      };
    },
  };
}

export const digitalWalletAgeProvider = buildStubAdapter({
  id: "digital_wallet_age",
  displayName: "Digital wallet age proof",
  assuranceLevel: "L3",
  enableEnv: "AGE_ASSURANCE_DIGITAL_WALLET_ENABLED",
  secretEnv: "AGE_ASSURANCE_DIGITAL_WALLET_API_KEY",
  capabilities: {
    over18: true,
    over21: true,
    exactDobReturned: false,
    documentUploadRequired: false,
    biometricRequired: false,
  },
});

export const verifiedEmailAgeProvider = buildStubAdapter({
  id: "verified_email_age",
  displayName: "Verified email age assurance",
  assuranceLevel: "L2",
  enableEnv: "AGE_ASSURANCE_VERIFIED_EMAIL_ENABLED",
  secretEnv: "AGE_ASSURANCE_VERIFIED_EMAIL_API_KEY",
  capabilities: {
    over18: true,
    over21: true,
    exactDobReturned: false,
    documentUploadRequired: false,
    biometricRequired: false,
  },
});

export const paymentCardAgeProvider = buildStubAdapter({
  id: "payment_card_age",
  displayName: "Payment card age assurance",
  assuranceLevel: "L2",
  enableEnv: "AGE_ASSURANCE_PAYMENT_CARD_ENABLED",
  secretEnv: "AGE_ASSURANCE_PAYMENT_CARD_API_KEY",
  capabilities: {
    over18: true,
    over21: true,
    exactDobReturned: false,
    documentUploadRequired: false,
    biometricRequired: false,
  },
});
