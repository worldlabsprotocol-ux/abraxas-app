// FILE: lib/partner/trustExecution/institutionalAuthorityGate.ts
// Fail closed unless Launchpad and the trust-execution store name the same sandbox authority.

import { loadPartnerApplicationAuthority } from "./partnerTrustExecutionService";
import {
  agreeInstitutionalAuthority,
  type InstitutionalAuthorityCode,
  type InstitutionalAuthorityRecord,
} from "./institutionalAuthorityBinding";

export async function requireBoundInstitutionalAuthority(input: {
  authorizedApplicationId: string;
  source: InstitutionalAuthorityRecord | null;
}): Promise<
  | { ok: true; binding: InstitutionalAuthorityRecord }
  | { ok: false; code: InstitutionalAuthorityCode }
> {
  if (!input.source) return { ok: false, code: "institutional_authority_missing" };
  if (input.source.applicationId !== input.authorizedApplicationId.trim()) {
    return { ok: false, code: "institutional_authority_mismatch" };
  }
  const scope = await loadPartnerApplicationAuthority({
    partnerId: input.source.partnerId,
    applicationId: input.source.applicationId,
  });
  if (!scope) return { ok: false, code: "institutional_authority_missing" };
  if (!scope.sourceRevision) {
    return { ok: false, code: "institutional_authority_missing" };
  }
  return agreeInstitutionalAuthority({
    source: input.source,
    sovereign: {
      applicationId: scope.applicationId,
      partnerId: scope.partnerId,
      policyId: scope.policyId,
      policyVersion: scope.policyVersion,
      status: scope.status,
      sourceRevision: scope.sourceRevision,
      environment: "sandbox",
    },
  });
}
