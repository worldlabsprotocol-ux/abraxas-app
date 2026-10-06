// FILE: lib/identity/providerIngestion/providerConfig.ts
// Provider-neutral authorization: claim families and assurance ceiling.

import type { AssuranceLevel } from "@/lib/credentials/claimSchema";
import { resolveCanonicalIssuer } from "@/lib/trust/resolveCanonicalIssuer";

const ASSURANCE_RANK: Record<AssuranceLevel, number> = {
  L0: 0, L1: 1, L2: 2, L3: 3, L4: 4,
};

export interface ProviderAuthorization {
  providerId: string;
  authorizedClaimTypes: string[];
  maxAssurance: AssuranceLevel;
  issuerStatus: string;
  environment: "sandbox" | "production";
}

function parseMaxAssurance(metadata: Record<string, unknown>): AssuranceLevel {
  const raw = metadata.max_assurance ?? metadata.maxAssurance;
  if (typeof raw === "string" && raw in ASSURANCE_RANK) {
    return raw as AssuranceLevel;
  }
  return "L2";
}

function parseAuthorizedClaims(
  issuerSupported: string[],
  metadata: Record<string, unknown>,
): string[] {
  const fromMeta = metadata.authorized_claims ?? metadata.authorizedClaims;
  if (Array.isArray(fromMeta)) {
    return fromMeta.filter((c): c is string => typeof c === "string");
  }
  return issuerSupported;
}

export async function loadProviderAuthorization(
  providerId: string,
): Promise<ProviderAuthorization | null> {
  const issuer = await resolveCanonicalIssuer(providerId);
  if (!issuer) return null;

  const metadata = issuer.metadata ?? {};
  const envRaw = metadata.environment;
  const environment = envRaw === "production" ? "production" : "sandbox";

  return {
    providerId,
    authorizedClaimTypes: parseAuthorizedClaims(issuer.supported_claims, metadata),
    maxAssurance: parseMaxAssurance(metadata),
    issuerStatus: issuer.issuer_status ?? issuer.trust_status,
    environment,
  };
}

export function assertClaimAuthorized(
  auth: ProviderAuthorization,
  claimType: string,
): boolean {
  return auth.authorizedClaimTypes.includes(claimType);
}

export function clampAssurance(
  auth: ProviderAuthorization,
  requested: AssuranceLevel | null | undefined,
): AssuranceLevel | null {
  if (!requested) return null;
  const maxRank = ASSURANCE_RANK[auth.maxAssurance];
  const reqRank = ASSURANCE_RANK[requested];
  if (reqRank > maxRank) return auth.maxAssurance;
  return requested;
}

export function isProviderActive(auth: ProviderAuthorization): boolean {
  return auth.issuerStatus === "active";
}
