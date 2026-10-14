import "server-only";

import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";
import { getActiveClaimsDirect, revokeSubjectClaimsDirect } from "@/lib/persistence/claimsDirectStore";

export async function resolveActiveClaimsForRuntime(subjectId: string): Promise<CredentialClaimRecord[]> {
  if (persistenceUsesDirectPostgres()) {
    return getActiveClaimsDirect(subjectId);
  }
  const { getActiveClaims } = await import("@/lib/credentials/claimsService");
  return getActiveClaims(subjectId);
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
