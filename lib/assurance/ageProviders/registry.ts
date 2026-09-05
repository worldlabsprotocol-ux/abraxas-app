// FILE: lib/assurance/ageProviders/registry.ts
// Server-only age-assurance provider registry.

import { randomBytes } from "crypto";
import {
  digitalWalletAgeProvider,
  paymentCardAgeProvider,
  verifiedEmailAgeProvider,
} from "./adapters/stubProvider";
import { isProviderAuthoritative, isProviderProductionCapable } from "./providerAuthority";
import type {
  AgeAssuranceProvider,
  AgeAssuranceProviderPublicMeta,
  AgeThreshold,
} from "./types";

const PROVIDERS: AgeAssuranceProvider[] = [
  digitalWalletAgeProvider,
  verifiedEmailAgeProvider,
  paymentCardAgeProvider,
];

const PROVIDER_MAP = new Map(PROVIDERS.map(p => [p.id, p]));

export function listAgeAssuranceProviders(): AgeAssuranceProvider[] {
  return [...PROVIDERS];
}

export function getAgeAssuranceProvider(providerId: string): AgeAssuranceProvider | null {
  return PROVIDER_MAP.get(providerId) ?? null;
}

function toPublicMeta(provider: AgeAssuranceProvider): AgeAssuranceProviderPublicMeta {
  const authoritative = isProviderAuthoritative(provider);
  const productionCapable = isProviderProductionCapable(provider);
  let unavailableReason: string | undefined;
  if (!productionCapable) {
    unavailableReason = "placeholder_not_production_capable";
  } else if (!provider.isConfigured()) {
    unavailableReason = "not_configured";
  }
  return {
    id: provider.id,
    displayName: provider.displayName,
    assuranceLevel: provider.assuranceLevel,
    capabilities: provider.capabilities,
    configured: provider.isConfigured(),
    authoritative,
    unavailableReason,
  };
}

export function listConfiguredAgeAssuranceProviderMeta(): AgeAssuranceProviderPublicMeta[] {
  return PROVIDERS.map(toPublicMeta);
}

/** Holder-visible providers — production-capable and authoritative only. */
export function listAvailableAgeAssuranceProviderMeta(
  requestedThreshold: AgeThreshold,
): AgeAssuranceProviderPublicMeta[] {
  return listConfiguredAgeAssuranceProviderMeta().filter(meta => {
    if (!meta.authoritative) return false;
    if (requestedThreshold >= 21) return meta.capabilities.over21;
    return meta.capabilities.over18;
  });
}

export function assertKnownProvider(providerId: string): AgeAssuranceProvider {
  const provider = getAgeAssuranceProvider(providerId);
  if (!provider) {
    throw new Error("unknown_provider");
  }
  return provider;
}

export function generateAgeAssuranceSessionNonce(): string {
  return randomBytes(24).toString("base64url");
}

export function ageBandSatisfiesThreshold(
  ageBand: string,
  threshold: AgeThreshold,
): boolean {
  if (ageBand === "unknown" || ageBand === "under_18") return false;
  if (threshold >= 21) return ageBand === "over_21";
  return ageBand === "over_18" || ageBand === "over_21";
}
