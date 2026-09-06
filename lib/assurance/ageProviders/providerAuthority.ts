// FILE: lib/assurance/ageProviders/providerAuthority.ts
// Central authority gates — placeholders can never satisfy age policy.

import type { AgeAssuranceProvider, AgeBand } from "./types";

export const PLACEHOLDER_CALLBACK_FAIL_CLOSED = {
  verified: false as const,
  ageBand: "unknown" as AgeBand,
  assuranceLevel: "L0",
  evidenceRefHash: "",
  reasonCode: "placeholder_not_authoritative",
};

export function isProviderProductionCapable(provider: AgeAssuranceProvider): boolean {
  return provider.isProductionCapable();
}

/** True only when a production-capable adapter has valid server-only configuration. */
export function isProviderAuthoritative(provider: AgeAssuranceProvider): boolean {
  return provider.isProductionCapable() && provider.isConfigured();
}

export function assertProviderAuthoritative(provider: AgeAssuranceProvider): void {
  if (!provider.isProductionCapable()) {
    throw new Error("provider_not_production_capable");
  }
  if (!provider.isConfigured()) {
    throw new Error("provider_not_configured");
  }
}
