// FILE: lib/passport/reusableCredential/authorizationCommitBinding.ts

import type { InstitutionalAuthorizationCommitRecord } from "@/lib/persistence/passportInstitutionalAuthorizationAtomic";

export type AuthorizationCommitBindingInput = {
  holderSubjectId: string;
  credentialId: string;
  partnerId: string;
  policyId: string;
  consentId: string;
  challengeId: string;
  requestId: string;
};

export function authorizationCommitBindingMatches(
  record: InstitutionalAuthorizationCommitRecord,
  input: AuthorizationCommitBindingInput,
): boolean {
  return (
    record.holder_subject_id === input.holderSubjectId
    && record.credential_id === input.credentialId
    && record.partner_id === input.partnerId
    && record.policy_id === input.policyId
    && record.consent_id === input.consentId
    && record.challenge_id === input.challengeId
    && record.request_id === input.requestId
  );
}
