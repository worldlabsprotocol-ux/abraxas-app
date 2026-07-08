// FILE: lib/credentials/sandboxClaims.ts
// Sandbox / demo claim metadata — must never satisfy production policies.

import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import { activeTier3Claims, type Tier3ClaimType } from "@/lib/passport/tier3Claims";

export const SANDBOX_ISSUER = "Abraxas Sandbox";
export const SANDBOX_ISSUER_ID = "issuer:abraxas-sandbox";
export const SANDBOX_ENVIRONMENT = "sandbox";
export const SANDBOX_STATUS = "demo";

export const SANDBOX_DISCLAIMER =
  "Sandbox demonstration — not a live financial offering or external partner integration.";

/** Claim value fields that mark a claim as sandbox-only demo data. */
export function isSandboxClaim(claim: Pick<CredentialClaimRecord, "claim_value" | "issuer_id">): boolean {
  const v = claim.claim_value;
  if (v.environment === SANDBOX_ENVIRONMENT) return true;
  if (v.status === SANDBOX_STATUS) return true;
  if (v.non_reliance === true) return true;
  if (claim.issuer_id === SANDBOX_ISSUER_ID) return true;
  if (v.issuer === SANDBOX_ISSUER) return true;
  return false;
}

export function sandboxClaimMetadata(): Record<string, unknown> {
  return {
    issuer: SANDBOX_ISSUER,
    environment: SANDBOX_ENVIRONMENT,
    status: SANDBOX_STATUS,
    non_reliance: true,
    source: "abraxas_partner_sandbox",
  };
}

/** Tier 3 claims that are not sandbox/demo — count toward production Tier 3. */
export function productionTier3ClaimTypes(claims: CredentialClaimRecord[]): Tier3ClaimType[] {
  const types = claims.filter(c => !isSandboxClaim(c)).map(c => c.claim_type);
  return activeTier3Claims(types);
}

export function hasSandboxTier3Only(claims: CredentialClaimRecord[]): boolean {
  const sandboxTypes = activeTier3Claims(
    claims.filter(c => isSandboxClaim(c)).map(c => c.claim_type),
  );
  const prodTypes = productionTier3ClaimTypes(claims);
  return sandboxTypes.length > 0 && prodTypes.length === 0;
}
