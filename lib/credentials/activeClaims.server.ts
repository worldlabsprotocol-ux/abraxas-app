import "server-only";

import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";
import { getActiveClaimsDirect, revokeSubjectClaimsDirect } from "@/lib/persistence/claimsDirectStore";

const AUTHORIZING_ASSURANCE = new Set(["L2", "L3", "L4"]);

/** Claims eligible to authorize partner policy evaluation (active, unexpired, sufficient assurance). */
export function filterClaimsForPolicyAuthorization(
  claims: CredentialClaimRecord[],
): CredentialClaimRecord[] {
  const now = Date.now();
  return claims.filter((c) => {
    if (c.status !== "active") return false;
    if (c.expires_at && Date.parse(c.expires_at) <= now) return false;
    if (c.assurance_level && !AUTHORIZING_ASSURANCE.has(c.assurance_level)) return false;
    return true;
  });
}

export async function resolveActiveClaimsForRuntime(subjectId: string): Promise<CredentialClaimRecord[]> {
  if (persistenceUsesDirectPostgres()) {
    return filterClaimsForPolicyAuthorization(await getActiveClaimsDirect(subjectId));
  }
  const { getActiveClaims } = await import("@/lib/credentials/claimsService");
  return filterClaimsForPolicyAuthorization(await getActiveClaims(subjectId));
}

export async function revokeSubjectClaimsForRuntime(
  subjectId: string,
  reason: string,
  jti?: string,
): Promise<void> {
  if (persistenceUsesDirectPostgres()) {
    await revokeSubjectClaimsDirect(subjectId, reason, jti);
    return;
  }
  const { revokeSubjectClaims } = await import("@/lib/credentials/claimsService");
  await revokeSubjectClaims(subjectId, reason, jti);
}
